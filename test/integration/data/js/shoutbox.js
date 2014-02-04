(function(){
  var window = this;

  // Utility object dom scripting normalization
  var DOM = {
    on: (function() {
      if(window.addEventListener) {
        return function(target, type, listener) {
          target.addEventListener(type, listener, false);
        };
      }
      return function(target, type, listener) {
        target.attachEvent('on' + type, listener);
      };
    })(),

    off: (function() {
      if(window.removeEventListener) {
        return function(target, type, listener) {
          target.removeEventListener(type, listener, false);
        };
      }
      return function(target, type, listener) {
        target.detachEvent('on' + type, listener);
      };
    })(),

    cancelEvent: function(event) {
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        event.returnValue = false;
      }
    }
  };

  var STORAGE_TRANSPORT_EVENT_TYPE = 'message';

  // Storage transport
  var eventHub = StorageMessenger.createEventHub();

  // Send message using storage transport
  var sendMessage = function(event) {
    var messageInput = document.getElementById('message');
    var message = messageInput.value;

    DOM.cancelEvent(event);

    messageInput.value = '';
    eventHub.trigger(STORAGE_TRANSPORT_EVENT_TYPE, message);
  };

  // Handler for storage transport message events
  var showReceivedMessage = function(params) {
    var value = params || '';
    document.getElementById('received-message').value = value;
  };

  eventHub.on(STORAGE_TRANSPORT_EVENT_TYPE, showReceivedMessage);
  DOM.on(document.getElementById('message-form'), 'submit', sendMessage);
}).call(this);
