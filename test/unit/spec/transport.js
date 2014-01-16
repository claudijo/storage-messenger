describe('transport', function() {
  var NOW = 1234567890;
  var RECENTLY = NOW - 100;
  var LONG_AGO = NOW - 500;

  var FAKE_STORAGE_EVENT_WITH_KEY_AND_NEW_VALUE = {
    key: 'key',
    newValue: 'new-value'
  };

  var FAKE_STORAGE_EVENT_WITH_ONLY_KEY = {
    key: 'key'
  };

  var OWN_EVENT_HANDLER = JSON.stringify({
    tag: '8cc00beb-0943-41e8-9bbf-a74f91e3679e',
    targetId: 'own-target-id'
  });

  var OTHER_EVENT_HANDLER = JSON.stringify({
    tag: '8cc00beb-0943-41e8-9bbf-a74f91e3679e',
    targetId: 'other-target-id'
  });

  var OWN_EVENT = JSON.stringify({
    eventId: 'event-id',
    tag: 'b6297eba-31e4-11e3-8cf6-ce3f5508acd9',
    targetId: 'own-target-id',
    event: 'event'
  });

  var OTHER_EVENT = JSON.stringify({
    eventId: 'event-id',
    tag: 'b6297eba-31e4-11e3-8cf6-ce3f5508acd9',
    targetId: 'other-target-id',
    event: 'event'
  });

  var transport;
  var sandbox;
  var fakeLocalStorage;
  var clock;

  beforeEach(function() {
    fakeLocalStorage = FakeLocalStorage.create();

    // Create and set up basic transport instance.
    transport = Object.create(StorageMessenger.transportProto);
    transport.guid = function() { return 'event-id'; };
    transport.ownTargetId = 'own-target-id';
    transport.localStorage = fakeLocalStorage;

    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers(NOW);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('with own and other active event handlers in local storage',
      function() {
    beforeEach(function() {
      // Set up fake local storage.
      fakeLocalStorage.setItem(OWN_EVENT_HANDLER, RECENTLY);
      fakeLocalStorage.setItem(OTHER_EVENT_HANDLER, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'setItem');
    });

    it('should store correct event in local storage when calling dispatchEvent',
        function() {
      transport.dispatch('event');
      expect(fakeLocalStorage.setItem).was.calledWith(OTHER_EVENT, NOW);
    });
  });

  describe('with own and other inactive event handlers in local storage',
      function() {
    beforeEach(function() {
      // Set up fake local storage.
      fakeLocalStorage.setItem(OWN_EVENT_HANDLER, RECENTLY);
      fakeLocalStorage.setItem(OTHER_EVENT_HANDLER, LONG_AGO);

      sandbox.spy(fakeLocalStorage, 'setItem');
    });

    it('should not store any items in local storage when calling dispatch',
        function() {
      transport.dispatch('event');
      expect(fakeLocalStorage.setItem).was.notCalled();
    });
  });

  describe('with own event handler and no other event handlers in local ' +
      'storage', function() {
    beforeEach(function() {
      // Set up fake local storage.
      fakeLocalStorage.setItem(OWN_EVENT_HANDLER, RECENTLY);
      sandbox.spy(fakeLocalStorage, 'setItem');
    });

    it('should not store any items in local storage when calling dispatch',
        function() {
      transport.dispatch('event');
      expect(fakeLocalStorage.setItem).was.notCalled();
    });
  });

  describe('with own event handler and own event in local storage', function() {
    beforeEach(function() {
      transport.eventHandler = sandbox.spy();

      // Set up fake local storage.
      fakeLocalStorage.setItem(OWN_EVENT_HANDLER, RECENTLY);
      fakeLocalStorage.setItem(OWN_EVENT, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'removeItem');
    });

    it('should invoke event handler with own event when calling ' +
        'handleStorageEvent', function() {
      transport.handleStorageEvent(FAKE_STORAGE_EVENT_WITH_KEY_AND_NEW_VALUE);
      clock.tick(1);
      expect(transport.eventHandler).was.calledWith('event');
    });

    it('should not invoke event handler if event has key member but not ' +
        'newValue member when calling handleStorageEvent', function() {
      transport.handleStorageEvent(FAKE_STORAGE_EVENT_WITH_ONLY_KEY);
      clock.tick(1);
      expect(transport.eventHandler).was.notCalled();
    });

    it('should remove own event from local storage when calling ' +
        'handleStorageEvent', function() {
      transport.handleStorageEvent(FAKE_STORAGE_EVENT_WITH_KEY_AND_NEW_VALUE);
      clock.tick(1);
      expect(fakeLocalStorage.removeItem).was.calledWith(OWN_EVENT);
    });
  });

  describe('with own event handler and other event in local storage', function() {
    beforeEach(function() {
      transport.eventHandler = sandbox.spy();

      // Set up fake local storage.
      fakeLocalStorage.setItem(OWN_EVENT_HANDLER, RECENTLY);
      fakeLocalStorage.setItem(OTHER_EVENT, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'removeItem');
    });

    it('should not invoke event handler when calling handleStorageEvent',
        function() {
      transport.handleStorageEvent(FAKE_STORAGE_EVENT_WITH_KEY_AND_NEW_VALUE);
      clock.tick(1);
      expect(transport.eventHandler).was.notCalled();
    });
  });

  describe('with own event handler, outdated event, and other inactive event ' +
      'handler in local storage', function() {
    beforeEach(function() {
      // Set up fake local storage.
      fakeLocalStorage.setItem(OWN_EVENT_HANDLER, RECENTLY);
      fakeLocalStorage.setItem(OTHER_EVENT, LONG_AGO);
      fakeLocalStorage.setItem(OTHER_EVENT_HANDLER, LONG_AGO);

      sandbox.spy(fakeLocalStorage, 'removeItem');
    });

    it('should remove outdated event', function() {
      transport.removeGarbage();
      expect(fakeLocalStorage.removeItem).was.calledWith(OTHER_EVENT);
    });

    it('should remove inactive event handler', function() {
      transport.removeGarbage();
      expect(fakeLocalStorage.removeItem).was.calledWith(OTHER_EVENT_HANDLER);
    });

    it('should not remove own event handler', function() {
      transport.removeGarbage();
      expect(fakeLocalStorage.removeItem).was
          .neverCalledWith(OWN_EVENT_HANDLER);
    });
  });

  describe('destruction with own event handler in local storage',
      function() {
    var storageEventTarget = 'onstorage' in document ? document : window;

    beforeEach(function() {
      fakeLocalStorage.setItem(OWN_EVENT_HANDLER, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'removeItem');
      sandbox.spy(fakeLocalStorage, 'setItem');

      transport.dom = {
        off: sandbox.spy()
      };
    });

    it('should remove DOM storage event handler', function() {
      transport.destroy();
      expect(transport.dom.off).was.calledWith(storageEventTarget, 'storage',
          transport.handleStorageEvent);
    });

    it('should remove DOM unload event handler', function() {
      transport.destroy();
      expect(transport.dom.off).was.calledWith(window, 'unload',
          transport.handleUnloadEvent);
    });

    it('should remove own event handler from local storage', function() {
      transport.destroy();
      expect(fakeLocalStorage.removeItem).was.calledWith(OWN_EVENT_HANDLER);
    });

    it('should clear keep alive interval', function() {
      transport.registerSelf();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledTwice();

      transport.destroy();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledTwice();
    });
  });

  describe('unloading page', function() {
    beforeEach(function() {
      sandbox.stub(transport, 'destroy');
    });

    it('should call destroy on page unload', function() {
      transport.handleUnloadEvent();
      expect(transport.destroy).was.called();
    });
  });

  describe('registration with own event handler in local storage', function() {
    beforeEach(function() {
      fakeLocalStorage.setItem(OWN_EVENT_HANDLER, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'setItem');
    });

    it('should store own event handler', function() {
      transport.registerSelf();
      expect(fakeLocalStorage.setItem).was.calledWith(OWN_EVENT_HANDLER, NOW);
    });

    it('should keep own event handler alive', function() {
      transport.registerSelf();
      expect(fakeLocalStorage.setItem).was.calledOnce();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledTwice();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledThrice();
    });
  });
});
