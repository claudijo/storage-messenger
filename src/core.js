/**
 * @fileoverview StorageMessenger.js is a micro library for JavaScript that
 *    utilizes HTML5 localStorage as transport mechanism for passing messages
 *    between browser windows with content loaded from the same domain.
 * @author Claudijo Borovic <claudijo.borovic@gmail.com>
 * @license The MIT License (MIT) Copyright (c) 2013 Claudijo Borovic
 */

( /** @exports StorageMessenger*/ function(root) {
  "use strict";

  /**
   * StorageMessenger namespace that will be exposed on the global object.
   * @namespace
   */
  var StorageMessenger = {

    /**
     * Current version.
     * @constant
     * @type {string}
     * @default
     */
    VERSION: '@VERSION@',

    /**
     * Unique string that identifies messages in storage.
     * @constant
     * @type {string}
     * @private
     * @default
     */
    _MESSAGE_TAG: 'b6297eba-31e4-11e3-8cf6-ce3f5508acd9',

    /**
     * Unique string that identifies message listeners in storage.
     * @constant
     * @type {string}
     * @private
     * @default
     */
    _MESSAGE_LISTENER_TAG: '8cc00beb-0943-41e8-9bbf-a74f91e3679e',

    /**
     * Number of ms before a message or a message listener found in storage
     *    is considered garbage.
     * @constant
     * @type {number}
     * @private
     * @default
     */
    _ITEM_TTL_MS: 400,

    /**
     * Previous version of the global `StorageMessenger` variable.
     * @constant
     * @type {*}
     * @private
     */
    _previousStorageMessenger: root.StorageMessenger,

    /**
     * Restore previous value of the global `StorageMessenger` variable.
     * @returns {StorageMessenger}
     */
    noConflict: function() {
      root.StorageMessenger = this._previousStorageMessenger;
      return this;
    },

    /**
     * Returns true if storage item is outdated.
     * @param {{key: string, value: string}} item - Storage item
     * @returns {boolean}
     * @private
     */
    _isGarbageItem: function(item) {
      return +new Date() - parseInt(item.value) > this._ITEM_TTL_MS;
    },

    /**
     * Returns true if storage item contains a storage message and target id.
     * @param {{key: string, value: string}} item - Storage item
     * @param {string} targetId - Target id for message listener
     * @returns {boolean}
     * @private
     */
    _itemContainsMessageWithTargetId: function(item, targetId) {
      return StorageMessenger._itemContainsMessage(item)
          && StorageMessenger._itemContainsTargetId(item, targetId)
    },

    /**
     * Returns true if storage item contains a storage message.
     * @param {{key: string, value: string}} item - Storage item
     * @returns {boolean}
     * @private
     */
    _itemContainsMessage: function(item) {
      return this._stringContains(this._MESSAGE_TAG, item.key);
    },

    /**
     * Returns true if storage item contains storage message listener.
     * @param {{key: string, value: string}} item - Storage item
     * @returns {boolean}
     * @private
     */
    _itemContainsMessageListener: function(item) {
      return this._stringContains(this._MESSAGE_LISTENER_TAG, item.key);
    },

    /**
     * Returns true if storage item contains target id.
     * @param {{key: string, value: string}} item - Storage item
     * @param {string} targetId - Target id.
     * @returns {boolean}
     * @private
     */
    _itemContainsTargetId: function(item, targetId) {
      return this._stringContains(targetId, item.key);
    },

    /**
     * Returns true if haystack contains needle. Operates on strings.
     * @param {string} needle - String to search for in haystack.
     * @param {string} haystack - String to search for needle in.
     * @returns {boolean}
     * @private
     */
    _stringContains: function(needle, haystack) {
      if (typeof haystack !== 'string') {
        return false;
      }

      return haystack.indexOf(needle) !== -1;
    },

    /**
     * Generate version 4 GUID.
     * @returns {string}
     * @private
     */
    _guid: function() {
      var s4 = function() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16)
            .substring(1);
      };

      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() +
          s4() + s4();
    },

    /**
     * Returns deserialized json in item key or null if invalid json.
     * @param {{key: string, value: string}} item - Storage item
     * @returns {*}
     * @private
     */
    _unmarshalItem: function(item) {
      var obj;
      try {
        obj = JSON.parse(item.key);
      } catch(e) {
        return null;
      }
      return obj;
    }
  };

  // Init-time branching optimization for adding / removing DOM event listeners.
  if (root.addEventListener) {
    StorageMessenger._addDomEventListener = function(target, type, listener) {
      target.addEventListener(type, listener, false);
    }
    StorageMessenger._removeDomEventListener = function(target, type,
        listener) {
      target.removeEventListener(type, listener, false);
    }
  } else if (root.attachEvent) {
    StorageMessenger._addDomEventListener = function(target, type, listener) {
      if (type === 'storage' && target == root) {
        // Adding listeners for storage event has special treatment for IE8,
        // which fires the storage event on document, not window.
        target = document;
      }
      target.attachEvent('on' + type, listener);
    }
    StorageMessenger._removeDomEventListener = function(target, type,
        listener) {
      if (type === 'storage' && target == root) {
        target = document;
      }
      target.detachEvent('on' + type, listener);
    }
  }

  /**
   * Create a message instance to be sent using web storage as transport.
   * @param {Storage} storage - Reference to the web storage used by the
   *    StorageMessenger module.
   * @param {{targetId: number, event: string, params}}
   *    options - Options object. Note that params member can be of any type as
   *    long as it is JSON-serializable
   * @protected
   * @constructor
   */
  StorageMessenger.Message = function(storage, options) {
    this._storage = storage;
    this._attributes = {
      tag: StorageMessenger._MESSAGE_TAG,
      messageId: StorageMessenger._guid(),
      targetId: options.targetId,
      event: options.event,
      params: options.params
    };
  };

  StorageMessenger.Message.prototype = {
    /**
     * JSON-serialize attributes and make them suitable for message passing.
     * @returns {string}
     */
    toJson: function() {
      return JSON.stringify(this._attributes);
    },

    /**
     * Send message by storing it to web storage and relying on the DOM storage
     * event to trigger listeners.
     */
    store: function() {
      this._storage.setItem(this.toJson(), +new Date());
    }
  }

  /**
   * Create a transport instance.
   * @param {Storage} storage - Reference to an object that confirms to the web
   *    storage interface, typically localStorage.
   * @constructor
   */
  StorageMessenger.Transport = function(storage) {
    var that = this;

    this._storage = storage || root.localStorage;

    this._ownTargetId = StorageMessenger._guid();
    this._MESSAGE_LISTENER_KEY = JSON.stringify({
      tag: StorageMessenger._MESSAGE_LISTENER_TAG,
      targetId: this._ownTargetId
    });
    this._transportListeners = [];

    this._domStorageEventListener = this._domStorageEventListener.bind(this);
    this._unregisterSelfAsMessageListener = this
        ._unregisterSelfAsMessageListener.bind(this);

    StorageMessenger._addDomEventListener(root, 'storage',
        this._domStorageEventListener);
    StorageMessenger._addDomEventListener(root, 'unload',
        this._unregisterSelfAsMessageListener);

    this._registerSelfAsMessageListener();

    setInterval(function() {
      that._registerSelfAsMessageListener();
    }, StorageMessenger._ITEM_TTL_MS);

    this._removeGarbageMessageListenersAndMessages();
  };

  StorageMessenger.Transport.prototype = {
    /**
     * Trigger event on the transport that can be heard in other browser
     *    windows with content loaded from the same domain.
     * @param {string} event - Event to trigger
     * @param {Object=} params - Parameters to the event. Must be
     *    JSON-serializable
     */
    trigger: function(event, params) {
      var listeners = this._getOtherMessageListeners();
      listeners.forEach(function(listener) {
        var message = new StorageMessenger.Message(this._storage, {
          event: event,
          params: params,
          targetId: listener.targetId
        });
        message.store();
      }, this);
    },

    /**
     * Add event listener to transport that will be applied when other browser
     *    windows with content loaded from the same domain trigger the event.
     * @param {string} event - Event to listen for
     * @param {function(Object)} listener - Listeners that will be applied with
     *    event parameters as argument.
     * @param {Object=} context - Object to use as `this` when applying
     *    `listener`.
     */
    listen: function(event, listener, context) {
      this._transportListeners.push({
        event: event,
        listener: listener,
        context: context
      });
    },

    /**
     * Remove event listener from transport. Listener will be removed if
     *    event, listener, and context match added listener.
     * @param {string} event - Event to ignore
     * @param {function(Object)} listener - Listeners that will be applied with
     *    event parameters as argument.
     * @param {Object=} context - Object to use as `this` when applying
     *    `listener`.
     */
    ignore: function(event, listener, context) {
      var transportListener;
      var i = this._transportListeners.length;
      while(i--) {
        transportListener = this._transportListeners[i];
        if (transportListener.event === event
            && transportListener.listener === listener
            && transportListener.context === context) {
          this._transportListeners.splice(i, 1);
        }
      }
    },

    /**
     * Executes a provided function once per item in storage.
     * @param {function({key: string, value: string})} callback - Callback that
     *    will be applied with for each item in storage.
     * @param {Object} context - Object to use as `this` when applying
     *    `callback`.
     * @private
     */
    _forEachItemInStorage: function(callback, context) {
      var key;
      var value;

      for (var i = 0; i < this._storage.length; i++) {
        key = this._storage.key(i);
        value = this._storage.getItem(key);
        callback.apply(context, [{key: key, value: value}]);
      }
    },

    /**
     * Get array with message objects from storage that match provided targetId.
     * @param {string} targetId - Filter messages in storage by targetId.
     * @returns {Array.Object} - Array of message objects.
     * @private
     */
    _getMessagesFromStorage: function(targetId) {
      var messages = [];
      this._forEachItemInStorage(function(item) {
        var message = this._getMessageWithTargetIdFromItem(item, targetId);

        if (message) {
          messages.push(message);
          this._storage.removeItem(item.key);
        }
      }, this);

      return messages;
    },

    /**
     * Remove all messages in storage that match provided targetId.
     * @param targetId - Filter messages in storage by targetId.
     * @private
     */
    _removeMessagesFromStorage: function(targetId) {
      this._forEachItemInStorage(function(item) {
        if (StorageMessenger._itemContainsMessageWithTargetId(item, targetId)) {
          this._storage.removeItem(item.key);
        }
      }, this);
    },

    /**
     * Function that is used as listener for DOM storage events. Will fetch own
     *    messages in storage asynchronously, and apply any added transport
     *    listeners that match the event found in messages.
     * @param {StorageEvent} event - Web storage event.
     * @private
     */
    _domStorageEventListener: function(event) {
      // Ignore events that have a storageKey, but not a storageValue, those
      // will be caused by deleting a item in storage on non IE8 browsers.
      if (event.key && !event.newValue) {
        return;
      }

      this._getOwnMessagesFromStorage(this._applyTransportListeners, this);
    },

    /**
     * Fetch own messages from storage asynchronously.
     * @param {function(Array.Object)} callback - Callback that will be
     *    applied with array of own messages.
     * @param {Object=} context - Object to use as `this` when applying
     *    `callback`.
     * @private
     */
    _getOwnMessagesFromStorage: function(callback, context) {
      var that = this;
      setTimeout(function() {
        var messages = that._getMessagesFromStorage(that._ownTargetId);
        callback.apply(context, [messages]);
      }, 0);
    },

    /**
     * Iterate supplied messages containing events and apply matching transport
     *    listeners.
     * @param {Array.Object} messages - Array of messages fetched from storage.
     * @private
     */
    _applyTransportListeners: function(messages) {
      messages.forEach(function(message) {
        this._transportListeners.forEach(function(transportListener) {
          if (transportListener.event === message.event) {
            transportListener.listener.apply(transportListener.context,
                [message.params]);
          }
        })
      }, this)
    },

    /**
     * Get array of storage messenger listeners, excluding self.
     * @returns {Array.Object}
     * @private
     */
    _getOtherMessageListeners: function() {
      var listeners = [];
      this._forEachItemInStorage(function(item) {
        var listener = this._getOtherMessageListenerFromItem(item);

        if (listener) {
          listeners.push(listener);
        }
      }, this);

      return listeners;
    },

    /**
     * Remove messenger listeners that are not up to date and considered
     *    garbage.
     * @private
     */
    _removeGarbageMessageListenersAndMessages: function() {
      this._forEachItemInStorage(function(item) {
        var listener = this._getGarbageMessageListenerFromItem(item);

        if (listener) {
          this._removeMessagesFromStorage(listener.targetId);
          this._storage.removeItem(item.key);
        }
      }, this);
    },

    /**
     * Returns message if item contains message with provided target id, else
     *    returns null.
     * @param {{key: string, value: string}} item - Storage item
     * @param {string} targetId - Target id.
     * @returns {{tag: string, messageId: string, targetId: string,
     *    event:string, params} | null}
     * @private
     */
    _getMessageWithTargetIdFromItem: function(item, targetId) {
      if (StorageMessenger._itemContainsMessageWithTargetId(item,  targetId)) {
        return StorageMessenger._unmarshalItem(item);
      }
      return null;
    },

    /**
     * Returns message listener if item contains garbage message, else returns
     *    null.
     * @param {{key: string, value: string}} item - Storage item
     * @returns {{tag: string, targetId: string} | null}
     * @private
     */
    _getGarbageMessageListenerFromItem: function(item) {
      if(this._isItemGarbageMessageListener(item)) {
        return StorageMessenger._unmarshalItem(item);
      }
      return null;
    },

    /**
     * Returns message listener if item contains other message listener, else
     *    returns null.
     * @param {{key: string, value: string}} item - Storage item
     * @returns {{tag: string, targetId: string} | null}
     * @private
     */
    _getOtherMessageListenerFromItem: function(item) {
      if (!this._isItemOtherMessageListener(item)) {
        return null;
      }
      return StorageMessenger._unmarshalItem(item);
    },

    /**
     * Returns true if item contains message listener, item is garbage, and
     *    item does not contain own target id.
     * @param {{key: string, value: string}} item - Storage item
     * @returns {boolean}
     * @private
     */
    _isItemGarbageMessageListener: function(item) {
      return StorageMessenger._itemContainsMessageListener(item)
          && StorageMessenger._isGarbageItem(item)
          && !StorageMessenger._itemContainsTargetId(item, this._ownTargetId);
    },

    _isItemOtherMessageListener: function(item) {
      return StorageMessenger._itemContainsMessageListener(item)
          && !StorageMessenger._isGarbageItem(item)
          && !StorageMessenger._itemContainsTargetId(item, this._ownTargetId)
    },

    /**
     * Unregister self as message listener from storage.
     * @private
     */
    _unregisterSelfAsMessageListener: function() {
      this._storage.removeItem(this._MESSAGE_LISTENER_KEY);
    },

    /**
     * Register self as message listener in storage.
     * @private
     */
    _registerSelfAsMessageListener: function() {
      this._storage.setItem(this._MESSAGE_LISTENER_KEY, +new Date());
    }
  };

  // Export StorageMessenger to global object.
  root.StorageMessenger = StorageMessenger;
})(this);
