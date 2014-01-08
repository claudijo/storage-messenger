/**
 * @fileoverview StorageMessenger.js is a JavaScript micro-library that
 *    utilizes HTML5 localStorage as transport mechanism for passing messages
 *    between browser windows with content loaded from the same domain.
 * @author Claudijo Borovic <claudijo.borovic@gmail.com>
 * @license The MIT License (MIT) Copyright (c) 2013 Claudijo Borovic
 */

(function(window, document) {
  'use strict';

  // Previous value of the global StorageMessenger variable.
  var previousStorageMessenger_ = window.StorageMessenger;

  // Namespace object for localStorage item tags.
  var TAG = {
    // Unique string that identifies messages in localStorage items.
    MESSAGE: 'b6297eba-31e4-11e3-8cf6-ce3f5508acd9',

    // Unique string that identifies message listeners in localStorage items.
    MESSAGE_LISTENER: '8cc00beb-0943-41e8-9bbf-a74f91e3679e'
  };

  // Number of milliseconds before a item found in localStorage is considered
  // garbage.
  var ITEM_TTL_MS = 400;

  // StorageMessenger namespace object that will be exposed on the global window
  // object.
  var StorageMessenger = {
    // Current version.
    VERSION: '@VERSION@',

    // Namespace object for methods related to DOM scripting browser
    // normalization.
    DOM: {
      // Adds DOM event listener. (Assigned on init-time depending on browser
      // capabilities.)
      on: (function() {
        if(window.addEventListener) {
          return function(target, event, callback) {
            target.addEventListener(event, callback, false);
          };
        }
        return function(target, event, callback) {
          target.attachEvent('on' + event, callback);
        };
      })(),

      // Removes DOM event listener. (Assigned on init-time depending on
      // browser capabilities.)
      off: (function() {
        if(window.removeEventListener) {
          return function(target, event, callback) {
            target.removeEventListener(event, callback, false);
          };
        }
        return function(target, event, callback) {
          target.detachEvent('on' + event, callback);
        };
      })()
    },

    // Restores previous value of the global StorageMessenger variable.
    noConflict: function() {
      window.StorageMessenger = previousStorageMessenger_;
      return this;
    },

    // Generates version 4 GUID.
    guid: function() {
      var s4 = function() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16)
            .substring(1);
      };

      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() +
          s4() + s4();
    }
  };

  // Creates an eventHub with specified transport mechanism. This constructor
  // should not be used directly, instead use the
  // StorageMessenger.EventHub.create builder function.
  StorageMessenger.EventHub = function(transport) {
    this.transport_ = transport;
    this.eventListeners_ = [];
  };

  // Creates an eventHub and wires up collaborators.
  StorageMessenger.EventHub.create = function() {
    var transport = StorageMessenger.Transport.create(localStorage);
    var eventHub = new StorageMessenger.EventHub(transport);

    transport.setTransportDataListener(
        eventHub.transportDataListener.bind(eventHub));

    return eventHub;
  };

  StorageMessenger.EventHub.prototype = {
    // Triggers an event that can be listened to in other browser windows with
    // content loaded from the same domain.
    trigger: function(event, params) {
      var data = {
        event: event,
        params: params
      };
      this.transport_.send(data);
    },

    // Adds event listener.
    on: function(event, callback) {
      this.eventListeners_.push({
        event: event,
        callback: callback
      });
    },

    // Removes event listener. Listener will be removed if event and callback
    // match added listener.
    off: function(event, callback) {
      var eventListener;
      var i = this.eventListeners_.length;
      while(i--) {
        eventListener = this.eventListeners_[i];
        if (eventListener.event === event &&
            eventListener.callback === callback) {
          this.eventListeners_.splice(i, 1);
        }
      }
    },

    // Listener for transport data. Invokes event listeners that match the
    // passed data.
    transportDataListener: function(data) {
      this.eventListeners_.forEach(function(eventListener) {
        if (eventListener.event === data.event) {
          eventListener.callback(data.params);
        }
      });
    }
  };

  // Creates transport. This constructor should not be used directly, instead
  // use StorageMessenger.Transport.create builder function.
  StorageMessenger.Transport = function(localStorage, targetId) {
    this.localStorage_ = localStorage;
    this.targetId_ = targetId;
    this.transportDataListener_ = null;
    this.keepAliveInterval_ = null;
  };

  // Creates a transport, wires up collaborators and initializes transport.
  StorageMessenger.Transport.create = function(localStorage) {
    var targetId = StorageMessenger.guid();
    var transport = new StorageMessenger.Transport(localStorage, targetId);
    var storageEventTarget = 'onstorage' in document ? document : window;

    transport.registerOwnMessageListener();

    // Replace methods that are passed as callbacks with corresponding bound
    // method, to facilitate removal and testing.
    transport.storageListener = transport.storageListener.bind(transport);
    transport.unloadListener = transport.unloadListener.bind(transport);

    StorageMessenger.DOM.on(storageEventTarget, 'storage',
        transport.storageListener);
    StorageMessenger.DOM.on(window, 'unload', transport.unloadListener);

    transport.removeGarbage();

    return transport;
  };

  StorageMessenger.Transport.prototype = {
    // Sends data.
    send: function(data) {
      this.storeMessageForOtherActiveMessageListeners_(data);
    },

    // Sets transport listener.
    setTransportDataListener: function(transportDataListener) {
      this.transportDataListener_ = transportDataListener;
    },

    //  Cleans up transport, including removing DOM event listeners and own
    // entries in localStorage.
    destroy: function() {
      var storageEventTarget = 'onstorage' in document ? document : window;
      this.deregisterOwnMessageListener_();
      StorageMessenger.DOM.off(storageEventTarget, 'storage',
          this.storageListener);
      StorageMessenger.DOM.off(window, 'unload', this.unloadListener);
    },

    // Storage DOM event listener. Handles own messages found in localStorage.
    storageListener: function(event) {
      // Ignore events that have a key, but not a newValue, those
      // will be caused by deleting a item in storage on non IE8 browsers.
      if (event.key && !event.newValue) {
        return;
      }

      // We need to wait until next event loop before handling own messages (ie.
      // reading/writing from/to localStorage).
      setTimeout(this.handleOwnMessage_.bind(this), 0);
    },

    // Unload DOM event listener. Destroys this transport. Will in particularly
    // remove own entries in localStorage.
    unloadListener: function() {
      this.destroy();
    },

    // Stores own message listener in localStorage and updates timestamp on
    // interval to keep message listener alive.
    registerOwnMessageListener: function() {
      this.storeMessageListener_(this.targetId_);
      this.keepAliveInterval_ =
          setInterval(this.storeMessageListener_.bind(this, this.targetId_),
          ITEM_TTL_MS);
    },

    // Removes own message listener from localStorage and clears interval that
    // keeps message listener alive.
    deregisterOwnMessageListener_: function() {
      this.forEachFilteredItem_(this.isOwnMessageListener_.bind(this),
          this.remove_.bind(this));
      clearInterval(this.keepAliveInterval_);
    },

    // Removes outdated items from localStorage.
    removeGarbage: function() {
      this.forEachFilteredItem_(this.isGarbage_.bind(this),
          this.remove_.bind(this));
    },

    // Stores message listener in localStorage.
    storeMessageListener_: function(targetId) {
      var transportListener = {
        tag: TAG.MESSAGE_LISTENER,
        targetId: targetId
      };
      this.localStorage_.setItem(JSON.stringify(transportListener), +new Date());
    },

    // Stores message in localStorage.
    storeMessage_: function(data, item) {
      var listener = JSON.parse(item.getKey());
      var message = {
        messageId: StorageMessenger.guid(),
        tag: TAG.MESSAGE,
        targetId: listener.targetId,
        data: data
      };

      this.localStorage_.setItem(JSON.stringify(message), +new Date());
    },

    // Handles any own messages found in localStorage.
    handleOwnMessage_: function() {
      this.forEachFilteredItem_(this.isOwnMessage_.bind(this),
          this.handleMessage_.bind(this));
    },

    // Stores a message in localStorage for each active message listener
    // (excluding self).
    storeMessageForOtherActiveMessageListeners_: function(data) {
      this.forEachFilteredItem_(
          this.isOtherActiveMessageListener_.bind(this),
          this.storeMessage_.bind(this, data));
    },

    // Removes specified item from localStorage.
    remove_: function(item) {
      this.localStorage_.removeItem(item.getKey());
    },

    // Invokes transport listener with message data and removes message from
    // localStorage.
    handleMessage_: function(item) {
      var message = JSON.parse(item.getKey());
      this.invokeTransportListener_(message.data);
      this.remove_(item);
    },

    // Returns true if specified item contains own message.
    isOwnMessage_: function(item) {
      return item.containsMessage() &&
          item.containsTargetId(this.targetId_);
    },

    // Returns true if specified item contains other active message listener.
    isOtherActiveMessageListener_: function(item) {
      return item.containsMessageListener() &&
          !item.containsTargetId(this.targetId_) && !item.isDead();
    },

    // Returns true if specified item contains own message listener.
    isOwnMessageListener_: function(item) {
      return item.containsMessageListener() &&
          item.containsTargetId(this.targetId_);
    },

    // Returns true if specified item is considered garbage.
    isGarbage_: function(item) {
      return item.isDead();
    },

    // Invokes listener with message data.
    invokeTransportListener_: function(data) {
      if (this.transportDataListener_) {
        this.transportDataListener_(data);
      }
    },

    // Invokes specified callback once for each item in storage.
    forEachItem_: function(callback) {
      var i = this.localStorage_.length;
      var key;
      var value;

      // Iterate backwards since callback might remove items.
      while(i--) {
        key = this.localStorage_.key(i);
        value = this.localStorage_.getItem(key);
        callback(new StorageMessenger.Item(key, value));
      }
    },

    // Invokes specified callback once for each item in localStorage that passes
    // specified filter.
    forEachFilteredItem_: function(filter, callback) {
      this.forEachItem_(function(item) {
        if (filter(item)) {
          callback(item);
        }
      });
    }
  };

  // Creates a wrapper object for an item in localStorage. Items should be
  // discarded unless key holds JSON data containing any TAG,
  // and the value holds a timestamp.
  StorageMessenger.Item = function(key, value) {
    this.key_ = key;
    this.value_ = value;
  };

  StorageMessenger.Item.prototype = {
    // Returns true if this item contains a message.
    containsMessage: function() {
      return this.key_.indexOf(TAG.MESSAGE) !== -1;
    },

    // Returns true if this item contains a message listener.
    containsMessageListener: function() {
      return this.key_.indexOf(TAG.MESSAGE_LISTENER) !== -1;
    },

    // Returns true if this item contains specified target id.
    containsTargetId: function(targetId) {
      return this.key_.indexOf(targetId) !== -1;
    },

    // Returns true if this item is considered outdated.
    isDead: function() {
      return +new Date() - parseInt(this.value_, 10) > ITEM_TTL_MS;
    },

    // Returns key of this item.
    getKey: function() {
      return this.key_;
    }
  };

  // Export StorageMessenger to global object.
  window.StorageMessenger = StorageMessenger;
})(window, document);
