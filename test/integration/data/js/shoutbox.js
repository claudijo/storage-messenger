(function(root){
  // Utility object dom scripting normalization
  var dom = {};
  var STORAGE_TRANSPORT_EVENT_NAME = 'message';

  // Storage transport
  var transport = new StorageMessenger.Transport();

  // Send message using storage transport
  var sendMessage = function(event) {
    var messageInput = document.getElementById('message');
    var message = messageInput.value;

    dom.cancelEvent(event);

    messageInput.value = '';
    transport.trigger(STORAGE_TRANSPORT_EVENT_NAME, message);
  };

  // Handler for storage transport message events
  var showReceivedMessage = function(params) {
    var value = params || '';
    document.getElementById('received-message').value = value;
  };

  dom.cancelEvent = function(event) {
    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = false;
    }
  };

  if (window.addEventListener) {
    dom.listen = function(element, event, listener) {
      element.addEventListener(event, listener, false);
    };
  } else {
    dom.listen = function(element, event, listener) {
      element.attachEvent('on' + event, listener);
    };
  }

  transport.listen(STORAGE_TRANSPORT_EVENT_NAME, showReceivedMessage);
  dom.listen(document.getElementById('message-form'), 'submit', sendMessage);

  // Export transport to global object so we can test its privates.
  root.transport = transport;
})(this);
