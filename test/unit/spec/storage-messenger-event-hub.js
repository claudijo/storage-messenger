describe('StorageMessenger.EventHub', function() {
  describe('factory', function() {
    it('should return instance of StorageMessenger.EventHub', function() {
      var eventHub = StorageMessenger.EventHub.create();
      expect(eventHub instanceof StorageMessenger.EventHub).to.be.ok();
    });
  });

  describe('eventHub', function() {
    var sandbox;
    var fakeTransport = {
      send: function() {}
    };
    var eventListener;
    var eventHub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      sandbox.spy(fakeTransport, 'send');
      eventListener = sandbox.spy();
      eventHub = new StorageMessenger.EventHub(fakeTransport);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should trigger event on transport when calling trigger', function() {
      eventHub.trigger('event', 'params');
      expect(fakeTransport.send).was.calledWith({
        event: 'event',
        params: 'params'
      });
    });

    it('should call added event listener when calling transportDataListener ' +
        'with expected event', function() {
      eventHub.on('event', eventListener);
      eventHub.transportDataListener({
        event: 'event',
        params: 'params'
      });
      expect(eventListener).was.calledWith('params');
    });

    it('should not call added event listener when calling ' +
        'transportDataListener with unexpected event', function() {
      eventHub.on('event', eventListener);
      eventHub.transportDataListener({
        event: 'other-event',
        params: 'params'
      });

      expect(eventListener).was.notCalled();
    });

    it('should not removed event listener when calling transportDataListener ' +
        'with expected event', function() {
      eventHub.on('event', eventListener);
      eventHub.off('event', eventListener);
      eventHub.transportDataListener({
        event: 'event',
        params: 'params'
      });
      expect(eventListener).was.notCalled();
    });
  });
});


