if (typeof DEV_MODE === 'undefined') {
  DEV_MODE = true;
}

(function() {
  'use strict';

  var StorageMessenger = {};
  var window = this;
  var document = this.document;

  var VERSION = '@VERSION@';

  var previousStorageMessenger = window.StorageMessenger;

  // Unique string that identifies events in local storage.
  var EVENT_TAG = 'b6297eba-31e4-11e3-8cf6-ce3f5508acd9';

  // Unique string that identifies event handlers in local storage.
  var EVENT_HANDLER_TAG = '8cc00beb-0943-41e8-9bbf-a74f91e3679e';

  // Number of milliseconds before an event or event handler found in
  // local storage is considered garbage.
  var ITEM_TTL_MS = 400;

  // Storage event target. IE8 will fire storage event on document, not window
  // like other modern browsers.
  var STORAGE_EVENT_TARGET = 'onstorage' in document ? document : window;

  // Namespace object for wrapper methods related to DOM scripting, including
  // browser normalization.
  var dom = {
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
  };

  var guid = function() {
    var s4 = function() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16)
          .substring(1);
    };

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() +
        s4() + s4();
  };

  var noConflict = function() {
    window.StorageMessenger = previousStorageMessenger;
    return StorageMessenger;
  };

  var itemProto = {
    // Defaults
    key: 'null',
    value: 0,

    // Returns true if this item contains a message.
    hasEvent: function() {
      return this.key.indexOf(EVENT_TAG) !== -1;
    },

    // Returns true if this item contains a message listener.
    hasEventHandler: function() {
      return this.key.indexOf(EVENT_HANDLER_TAG) !== -1;
    },

    // Returns true if this item contains specified target id.
    hasTargetId: function(targetId) {
      return this.key.indexOf(targetId) !== -1;
    },

    parse: function() {
      return JSON.parse(this.key);
    },

    stringify: function() {
      return this.key;
    },

    // Returns true if this item is considered outdated.
    isDead: function() {
      return +new Date() - parseInt(this.value, 10) > ITEM_TTL_MS;
    }
  };

  var transportProto = {
    // Defaults
    localStorage: localStorage,
    dom: dom,
    guid: guid,
    ownTargetId: '',
    eventHandler: null,

    dispatch: function(event) {
      this.storeEventForOtherActiveEventHandlers(event);
    },

    destroy: function() {
      this.deregisterSelf();
      this.dom.off(STORAGE_EVENT_TARGET, 'storage', this.handleStorageEvent);
      this.dom.off(window, 'unload', this.handleUnloadEvent);
    },

    handleStorageEvent: function(event) {
      if (event.key && !event.newValue) {
        return;
      }
      setTimeout(this.handleOwnEvent.bind(this), 0);
    },

    handleUnloadEvent: function(event) {
      this.destroy();
    },

    registerSelf: function() {
      this.storeEventHandler(this.ownTargetId);
      this.keepAliveInterval =
          setInterval(this.storeEventHandler.bind(this, this.ownTargetId),
              ITEM_TTL_MS);
    },

    deregisterSelf: function() {
      this.forEachFilteredItem(this.isOwnEventHandler.bind(this),
          this.remove.bind(this));
      clearInterval(this.keepAliveInterval);
    },

    removeGarbage: function() {
      this.forEachFilteredItem(this.isGarbage.bind(this),
          this.remove.bind(this));
    },

    storeEventHandler: function(targetId) {
      var eventHandler = {
        tag: EVENT_HANDLER_TAG,
        targetId: targetId
      };
      this.localStorage.setItem(JSON.stringify(eventHandler), +new Date());
    },

    storeEvent: function(event, item) {
      this.localStorage.setItem(JSON.stringify({
        eventId: this.guid(),
        tag: EVENT_TAG,
        targetId: item.parse().targetId,
        event: event
      }), +new Date());
    },

    handleOwnEvent: function() {
      this.forEachFilteredItem(this.isOwnEvent.bind(this),
          this.handleEvent.bind(this));
    },

    storeEventForOtherActiveEventHandlers: function(event) {
      this.forEachFilteredItem(this.isOtherActiveEventHandler.bind(this),
          this.storeEvent.bind(this, event));
    },

    remove: function(item) {
      this.localStorage.removeItem(item.stringify());
    },

    handleEvent: function(item) {
      this.invokeEventHandler(item.parse().event);
      this.remove(item);
    },

    isOwnEvent: function(item) {
      return item.hasEvent() && item.hasTargetId(this.ownTargetId);
    },

    isOtherActiveEventHandler: function(item) {
      return item.hasEventHandler() && !item.hasTargetId(this.ownTargetId) &&
          !item.isDead();
    },

    isOwnEventHandler: function(item) {
      return item.hasEventHandler() && item.hasTargetId(this.ownTargetId);
    },

    isGarbage: function(item) {
      return item.isDead();
    },

    invokeEventHandler: function(event) {
      if(this.eventHandler) {
        this.eventHandler(event);
      }
    },

    forEachItem: function(callback) {
      var i = this.localStorage.length;
      var foundItem;

      while(i--) {
        foundItem = Object.create(itemProto);
        foundItem.key = this.localStorage.key(i);
        foundItem.value = this.localStorage.getItem(foundItem.key);
        callback(foundItem);
      }
    },

    forEachFilteredItem: function(filter, callback) {
      this.forEachItem(function(item) {
        if (filter(item)) {
          callback(item);
        }
      });
    }
  };

  var eventHubProto = {
    // defaults
    eventHandlers: null,
    transport: null,

    handleEvent: function(event) {
      this.eventHandlers.forEach(function(eventHandler) {
        if (eventHandler.type === event.type) {
          eventHandler.callback(event.params);
        }
      });
    },

    trigger: function(type, params) {
      this.transport.dispatch({
        type: type,
        params: params
      });
    },

    on: function(type, callback) {
      this.eventHandlers.push({
        type: type,
        callback: callback
      });
    },

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

    destroy: function() {
      this.transport.destroy();
    }
  };

  // Composition root
  var create = function() {
    var transport = Object.create(transportProto);
    var eventHub = Object.create(eventHubProto);

    eventHub.transport = transport;
    eventHub.eventHandlers = [];

    transport.ownTargetId = guid();
    transport.eventHandler = eventHub.handleEvent.bind(eventHub);

    // Bind DOM event handlers so the handler can be removed at later stage.
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

  // Expose public API.
  StorageMessenger.create = create;
  StorageMessenger.noConflict = noConflict;
  StorageMessenger.VERSION = VERSION;

  // Expose private parts that are relevant to unit test during development.
  if (DEV_MODE) {
    StorageMessenger.eventHubProto = eventHubProto;
    StorageMessenger.transportProto = transportProto;
  }

  // Export StorageMessenger on global object.
  window.StorageMessenger = StorageMessenger;
}).call(this);
