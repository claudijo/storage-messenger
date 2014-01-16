describe('evenHub', function() {
  var eventHub;
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    eventHub = Object.create(StorageMessenger.eventHubProto);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('handleEvent', function() {
    var fooCallback;

    beforeEach(function() {
      fooCallback = sandbox.spy();

      eventHub.eventHandlers = [
        {
          type: 'foo',
          callback: fooCallback
        }
      ];
    });

    it('should invoke event handler with params if event types match',
        function() {
      eventHub.handleEvent({
        type: 'foo',
        params: 'bar'
      });

      expect(fooCallback).was.calledWith('bar');
    });

    it('should not invoke event handler if event types do not match',
        function() {
      eventHub.handleEvent({
        type: 'baz',
        params: 'quax'
      });

      expect(fooCallback).was.notCalled();
    });
  });

  describe('trigger', function() {
    beforeEach(function() {
      eventHub.transport = {
        dispatch: sandbox.spy()
      }
    });

    it('should dispatch events to transport', function() {
      eventHub.trigger('foo', 'bar');
      expect(eventHub.transport.dispatch).was.calledWith({
        type: 'foo',
        params: 'bar'
      });
    });
  });

  describe('on', function() {
    var callback = function() {};

    beforeEach(function() {
      eventHub.eventHandlers = [];
    });

    it('should add event handler', function() {
      eventHub.on('foo', callback);
      expect(eventHub.eventHandlers[0]).to.eql({
        type: 'foo',
        callback: callback
      })
    });
  });

  describe('off', function() {
    var callback = function() {};

    beforeEach(function() {
      eventHub.eventHandlers = [
        {
          type: 'foo',
          callback: callback
        }
      ];
    });

    it('should remove event handler if type and callback match', function() {
      eventHub.off('foo', callback);
      expect(eventHub.eventHandlers.length).to.be(0);
    });

    it('should not remove event handler if type does not match', function() {
      eventHub.off('bar', callback);
      expect(eventHub.eventHandlers.length).to.be(1);
    });

    it('should not remove event handler if callback does not match', function() {
      eventHub.off('foo', function() {});
      expect(eventHub.eventHandlers.length).to.be(1);
    });
  });

  describe('destroy', function() {
    beforeEach(function() {
      eventHub.transport = {
        destroy: sandbox.spy()
      }
    });

    it('should destroy transport', function() {
      eventHub.destroy();
      expect(eventHub.transport.destroy).was.called();
    })
  });
});
