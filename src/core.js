//      StorageMessenger.js is a JavaScript micro-library that utilizes W3C Web
//      Storage (localStorage) as a transport mechanism for message passing
//      between browser windows with content loaded from the same domain.
//      (c) 2013-2014 Claudijo Borovic <claudijo.borovic@gmail.com>
//      StorageMessenger.js may be freely distributed under the The MIT License.

(function() {
  'use strict';

  // Initial Setup
  // -------------

  // Local reference to the gloabal `window` object.
  var window = this;

  // Local reference to the `document` object contained in `window`.
  var document = this.document;

  // The top-level namespace that will exported to the global `window` object.
  var StorageMessenger = {};

  // Current version.
  var VERSION = '@VERSION@';

  // Previous value of the gloabl `StorageMessenger` variable, so it can be
  // restored later on, if `noConflict` is used.
  var previousStorageMessenger = window.StorageMessenger;

  // Unique string that identifies events in local storage.
  var EVENT_TAG = 'b6297eba-31e4-11e3-8cf6-ce3f5508acd9';

  // Unique string that identifies event handlers in local storage.
  var EVENT_HANDLER_TAG = '8cc00beb-0943-41e8-9bbf-a74f91e3679e';

  // Number of milliseconds before an event or event handler found in
  // local storage is considered garbage.
  var ITEM_TTL_MS = 400;

  // Storage event target. IE8 will fire storage event on `document`, not
  // `window` like other modern browsers.
  var STORAGE_EVENT_TARGET = 'onstorage' in document ? document : window;

  // Namespace for helper methods related to DOM scripting, including browser
  // normalization.
  var dom = {
    // Adds DOM event handler. (Assigned on init-time depending on browser
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

    // Removes DOM event handler. (Assigned on init-time depending on
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
  };

  // Generates a version 4 GUID.
  var guid = function() {
    var s4 = function() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16)
          .substring(1);
    };

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() +
        s4() + s4();
  };

  // Restores previous value of the global `StorageMessenger` variable. Returns
  // a reference to this `StorageMessenger` object.
  var noConflict = function() {
    window.StorageMessenger = previousStorageMessenger;
    return StorageMessenger;
  };

  // Prototype Objects
  // -----------------

  // Prototype for an item object, which wraps a `localStorage` item. Items
  // should be discarded unless it holds an event or an event handler, together
  // with a timestamp.
  var itemProto = {
    // Set to the key of an item in local storage. A valid item holds JSON data
    // representing an event or an event handler. The default value must be
    // be overwritten when creating a new instance.
    key: 'null',

    // Set to the value of an item in local storage. A valid item holds a number
    // representing the timestamp when the item was created or refreshed. The
    // default value must be overwritten when creating a new instance.
    value: 0,

    // Returns true if this item contains an event.
    hasEvent: function() {
      return this.key.indexOf(EVENT_TAG) !== -1;
    },

    // Returns true if this item contains an event handler.
    hasEventHandler: function() {
      return this.key.indexOf(EVENT_HANDLER_TAG) !== -1;
    },

    // Returns true if this item contains specified target id.
    hasTargetId: function(targetId) {
      return this.key.indexOf(targetId) !== -1;
    },

    // Returns parsed JSON data.
    parse: function() {
      return JSON.parse(this.key);
    },

    // Returns JSON data.
    stringify: function() {
      return this.key;
    },

    // Returns true if this item is considered outdated.
    isDead: function() {
      return +new Date() - parseInt(this.value, 10) > ITEM_TTL_MS;
    }
  };

  // Prototype for a transport object.
  var transportProto = {
    // Internal reference to `localStorage`.
    localStorage: localStorage,

    // Internal reference to the `dom` helper object.
    dom: dom,

    // Internal reference to the `guid` generator.
    guid: guid,

    // String specifying this even handlers unique id.
    ownTargetId: '',

    // Function to call when an event is dispatched on `localStorage`.
    eventHandler: null,

    // Stores an event targeted at other event handlers that are registered in
    // `localStorage`.
    dispatch: function(event) {
      this.storeEventForOtherActiveEventHandlers(event);
    },

    // Cleans up transport, including removing DOM event handlers and own
    // entries in localStorage.
    destroy: function() {
      this.dom.off(STORAGE_EVENT_TARGET, 'storage', this.handleStorageEvent);
      this.dom.off(window, 'unload', this.handleUnloadEvent);
      this.deregisterSelf();
    },

    // Handles DOM storage events. Events found in `localStorage` will be
    // handled if they are targeted at this event handler.
    handleStorageEvent: function(event) {
      if (event.key && !event.newValue) {
        return;
      }
      setTimeout(this.handleOwnEvent.bind(this), 0);
    },

    // Handles DOM unload events. Cleans up the transport.
    handleUnloadEvent: function(event) {
      this.destroy();
    },

    // Stores own event handler in `localStorage` and updates timestamp on
    // interval to keep event handler alive.
    registerSelf: function() {
      this.storeEventHandler(this.ownTargetId);
      this.keepAliveInterval =
          setInterval(this.storeEventHandler.bind(this, this.ownTargetId),
              ITEM_TTL_MS);
    },

    // Removes own event handler from `localStorage` and clears interval that
    // keeps event handler alive.
    deregisterSelf: function() {
      this.forEachFilteredItem(this.isOwnEventHandler.bind(this),
          this.remove.bind(this));
      clearInterval(this.keepAliveInterval);
    },

    // Removes outdated items from localStorage.
    removeGarbage: function() {
      this.forEachFilteredItem(this.isGarbage.bind(this),
          this.remove.bind(this));
    },

    // Stores specified event handler in `localStorage`.
    storeEventHandler: function(targetId) {
      var eventHandler = {
        tag: EVENT_HANDLER_TAG,
        targetId: targetId
      };
      this.localStorage.setItem(JSON.stringify(eventHandler), +new Date());
    },

    // Stores specified event in `localStorage` targeted at event handler found
    // in specified item.
    storeEvent: function(event, item) {
      this.localStorage.setItem(JSON.stringify({
        eventId: this.guid(),
        tag: EVENT_TAG,
        targetId: item.parse().targetId,
        event: event
      }), +new Date());
    },

    // Handles own events.
    handleOwnEvent: function() {
      this.forEachFilteredItem(this.isOwnEvent.bind(this),
          this.handleEvent.bind(this));
    },

    // Stores specified event with other event handlers as targets.
    storeEventForOtherActiveEventHandlers: function(event) {
      this.forEachFilteredItem(this.isOtherActiveEventHandler.bind(this),
          this.storeEvent.bind(this, event));
    },

    // Removes item representation in `localStorage`.
    remove: function(item) {
      this.localStorage.removeItem(item.stringify());
    },

    // Handles event found in specified item.
    handleEvent: function(item) {
      this.invokeEventHandler(item.parse().event);
      this.remove(item);
    },

    // Returns true if specified item contains an event that is targeted at this
    // event handler.
    isOwnEvent: function(item) {
      return item.hasEvent() && item.hasTargetId(this.ownTargetId);
    },

    // Returns true if specified item contains an event handler that is not
    // dead, excluding self.
    isOtherActiveEventHandler: function(item) {
      return item.hasEventHandler() && !item.hasTargetId(this.ownTargetId) &&
          !item.isDead();
    },

    // Returns true if specified item contains own event handler.
    isOwnEventHandler: function(item) {
      return item.hasEventHandler() && item.hasTargetId(this.ownTargetId);
    },

    // Returns true if specified item contains an event or an event handler that
    // in considered garbage.
    isGarbage: function(item) {
      return (item.hasEvent() || item.hasEventHandler()) && item.isDead();
    },

    // Calls this event handler with specified event.
    invokeEventHandler: function(event) {
      if(this.eventHandler) {
        this.eventHandler(event);
      }
    },

    // Invokes specified callback for each item in `localStorage`.
    forEachItem: function(callback) {
      var i = this.localStorage.length;
      var item;

      while(i--) {
        item = Object.create(itemProto);
        item.key = this.localStorage.key(i);
        item.value = this.localStorage.getItem(item.key);
        callback(item);
      }
    },

    // Invokes specified callback for each item in `localStorage` that passes
    // the specified filter.
    forEachFilteredItem: function(filter, callback) {
      this.forEachItem(function(item) {
        if (filter(item)) {
          callback(item);
        }
      });
    }
  };

  // Prototype for an event hub object.
  var eventHubProto = {
    // Array with event handlers. The default value must be overwritten when
    // creating a new instance.
    eventHandlers: [],

    // Transport used for dispatching events. The default value must be
    // overwritten when creating a new instance.
    transport: null,

    // Calls registered event handlers with specified event params if they
    // listens specified to event type.
    handleEvent: function(event) {
      this.eventHandlers.forEach(function(eventHandler) {
        if (eventHandler.type === event.type) {
          eventHandler.callback(event.params);
        }
      });
    },

    // Dispatches event on transport with specified type and params.
    trigger: function(type, params) {
      this.transport.dispatch({
        type: type,
        params: params
      });
    },

    // Adds event handler.
    on: function(type, callback) {
      this.eventHandlers.push({
        type: type,
        callback: callback
      });
    },

    // Removes event handler.
    off: function(type, callback) {
      var eventHandler;
      var i = this.eventHandlers.length;
      while(i--) {
        eventHandler = this.eventHandlers[i];
        if (eventHandler.type === type &&
            eventHandler.callback === callback) {
          this.eventHandlers.splice(i, 1);
        }
      }
    },

    // Cleans up the transport.
    destroy: function() {
      this.transport.destroy();
    }
  };

  // Composition Root
  // ----------------

  // Creates an eventHub and a transport. Return object with the public methods
  // of the eventHub.
  var create = function() {
    var transport = Object.create(transportProto);
    var eventHub = Object.create(eventHubProto);

    eventHub.transport = transport;
    eventHub.eventHandlers = [];

    transport.ownTargetId = guid();
    transport.eventHandler = eventHub.handleEvent.bind(eventHub);

    // Bind and reassign DOM event handlers, so that they have correct receivers
    // and can be removed after being added.
    transport.handleStorageEvent = transport.handleStorageEvent.bind(transport);
    transport.handleUnloadEvent = transport.handleUnloadEvent.bind(transport);

    dom.on(STORAGE_EVENT_TARGET, 'storage', transport.handleStorageEvent);
    dom.on(window, 'unload', transport.handleUnloadEvent);

    transport.registerSelf();
    transport.removeGarbage();

    // Return object with public methods of the event hub.
    return {
      on: eventHub.on.bind(eventHub),
      off: eventHub.off.bind(eventHub),
      trigger: eventHub.trigger.bind(eventHub),
      destroy: eventHub.destroy.bind(eventHub)
    };
  };

  // Public API and Exports
  // ----------------------

  // Expose public members on top-level namespace object.
  StorageMessenger.create = create;
  StorageMessenger.noConflict = noConflict;
  StorageMessenger.VERSION = VERSION;

  // @exclude
  // Expose private parts that are relevant to unit test. Will be excluded by
  // preprocessor.
  StorageMessenger.eventHubProto = eventHubProto;
  StorageMessenger.transportProto = transportProto;
  // @endexclude

  // Export StorageMessenger on global object.
  window.StorageMessenger = StorageMessenger;
}).call(this);
