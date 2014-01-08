describe('StorageMessenger.Transport', function() {
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

  var OWN_MESSAGE_LISTENER = JSON.stringify({
    tag: '8cc00beb-0943-41e8-9bbf-a74f91e3679e',
    targetId: 'own-target-id'
  });

  var OWN_MESSAGE = JSON.stringify({
    messageId: 'message-id',
    tag: 'b6297eba-31e4-11e3-8cf6-ce3f5508acd9',
    targetId: 'own-target-id',
    data: 'data'
  });

  var OTHER_LISTENER = JSON.stringify({
    tag: '8cc00beb-0943-41e8-9bbf-a74f91e3679e',
    targetId: 'other-target-id'
  });

  var OTHER_MESSAGE = JSON.stringify({
    messageId: 'message-id',
    tag: 'b6297eba-31e4-11e3-8cf6-ce3f5508acd9',
    targetId: 'other-target-id',
    data: 'data'
  });

  describe('factory', function() {
    var sandbox;
    var clock;
    var fakeLocalStorage;
    var storageEventTarget = 'onstorage' in document ? document : window;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();
      sandbox.spy(fakeLocalStorage, 'setItem');
      sandbox.spy(fakeLocalStorage, 'removeItem');
      sandbox.stub(StorageMessenger, 'guid').returns('own-target-id');
      sandbox.spy(StorageMessenger.DOM, 'on');
      clock = sandbox.useFakeTimers(NOW);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should return instance of StorageMessenger.Transport', function() {
      var transport = StorageMessenger.Transport.create(fakeLocalStorage);
      expect(transport instanceof StorageMessenger.Transport).to.be.ok();
    });

    it('should register own transport listener', function() {
      StorageMessenger.Transport.create(fakeLocalStorage);
      expect(fakeLocalStorage.setItem).was.calledWith(OWN_MESSAGE_LISTENER,
          NOW);
    });

    it('should keep own transport listener alive', function() {
      StorageMessenger.Transport.create(fakeLocalStorage);
      expect(fakeLocalStorage.setItem).was.calledOnce();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledTwice();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledThrice();
    });

    it('should add DOM storage event listener', function() {
      var transport = StorageMessenger.Transport.create(fakeLocalStorage);
      expect(StorageMessenger.DOM.on).was.calledWith(storageEventTarget,
          'storage', transport.storageListener);
    });

    it('should add DOM unload event listener', function() {
      var transport = StorageMessenger.Transport.create(fakeLocalStorage);
      expect(StorageMessenger.DOM.on).was.calledWith(window, 'unload',
          transport.unloadListener);
    });

    it('should remove garbage items found in localStorage', function() {
      // Add other inactive listener
      fakeLocalStorage.setItem(OTHER_LISTENER, LONG_AGO);

      StorageMessenger.Transport.create(fakeLocalStorage);
      expect(fakeLocalStorage.removeItem).was.calledWith(OTHER_LISTENER);
    });
  });

  describe('transport with own message listener and other active message ' +
      'listener in localStorage', function() {
    var sandbox;
    var clock;
    var fakeLocalStorage;
    var transport;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();
      clock = sandbox.useFakeTimers(NOW);

      // Add self as listener
      fakeLocalStorage.setItem(OWN_MESSAGE_LISTENER, RECENTLY);

      // Add other listener
      fakeLocalStorage.setItem(OTHER_LISTENER, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'setItem');
      sandbox.stub(StorageMessenger, 'guid').returns('message-id');

      transport = new StorageMessenger.Transport(fakeLocalStorage,
          'own-target-id');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should store correct message to localStorage when calling trigger',
        function() {
      transport.send('data');
      expect(fakeLocalStorage.setItem).was.calledWith(OTHER_MESSAGE, NOW);
    });
  });

  describe('transport with own message listener and other inactive message ' +
      'listener in localStorage', function() {
    var sandbox;
    var clock;
    var fakeLocalStorage;
    var transport;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();
      clock = sandbox.useFakeTimers(NOW);

      // Add self as listener
      fakeLocalStorage.setItem(OWN_MESSAGE_LISTENER, RECENTLY);

      // Add other inactive listener
      fakeLocalStorage.setItem(OTHER_LISTENER, LONG_AGO);

      sandbox.spy(fakeLocalStorage, 'setItem');
      transport = new StorageMessenger.Transport(fakeLocalStorage,
          'own-target-id');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should not store any item to localStorage when calling `trigger`',
        function() {
      transport.send('event', 'params');
      expect(fakeLocalStorage.setItem).was.notCalled();
    });
  });

  describe('transport with own message listener and no other message ' +
      'listeners in localStorage', function() {
    var sandbox;
    var transport;
    var fakeLocalStorage;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();

      // Add self as listener
      fakeLocalStorage.setItem(OWN_MESSAGE_LISTENER, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'setItem');
      transport = new StorageMessenger.Transport(fakeLocalStorage,
          'own-target-id');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should not store any item to localStorage when calling trigger',
        function() {
      transport.send('event', 'params');
      expect(fakeLocalStorage.setItem).was.notCalled();
    });
  });

  describe('transport with own message listener and own message in ' +
      'localStorage', function() {
    var sandbox;
    var clock;
    var fakeLocalStorage;
    var transportDataListener;
    var transport;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();
      clock = sandbox.useFakeTimers(NOW);

      // Add self as listener
      fakeLocalStorage.setItem(OWN_MESSAGE_LISTENER, RECENTLY);

      // Add own message
      fakeLocalStorage.setItem(OWN_MESSAGE, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'removeItem');

      transportDataListener = sandbox.spy();
      transport = new StorageMessenger.Transport(fakeLocalStorage,
          'own-target-id');

      transport.setTransportDataListener(transportDataListener);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should invoke transport listener with own messages on storage event',
        function() {
      transport.storageListener(FAKE_STORAGE_EVENT_WITH_KEY_AND_NEW_VALUE);
      clock.tick(1);
      expect(transportDataListener).was.calledWith('data');
    });

    it('should do nothing on storage event if event has key but not newValue',
        function() {
      transport.storageListener(FAKE_STORAGE_EVENT_WITH_ONLY_KEY);
      clock.tick(1);
      expect(transportDataListener).was.notCalled();
    });

    it('should remove own message from localStorage on storage event',
        function() {
      transport.storageListener(FAKE_STORAGE_EVENT_WITH_KEY_AND_NEW_VALUE);
      clock.tick(1);
      expect(fakeLocalStorage.removeItem).was.calledWith(OWN_MESSAGE);
    });
  });

  describe('transport with own message listener and someone else\'s message ' +
      'in localStorage', function() {
    var sandbox;
    var clock;
    var fakeLocalStorage;
    var transportDataListener;
    var transport;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();
      clock = sandbox.useFakeTimers(NOW);

      // Add self as listener
      fakeLocalStorage.setItem(OWN_MESSAGE_LISTENER, RECENTLY);

      // Add other message
      fakeLocalStorage.setItem(OTHER_MESSAGE, RECENTLY);

      transportDataListener = sandbox.spy();
      transport = new StorageMessenger.Transport(fakeLocalStorage,
          'own-target-id');

      transport.setTransportDataListener(transportDataListener);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should not call onMessage on storage event', function() {
      transport.storageListener(FAKE_STORAGE_EVENT_WITH_KEY_AND_NEW_VALUE);
      expect(transportDataListener).was.notCalled();
    });
  });

  describe('transport with own message listener, outdated message, and ' +
      'inactive messages listener in localStorage', function() {
    var sandbox;
    var clock;
    var fakeLocalStorage;
    var transport;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();
      clock = sinon.useFakeTimers(NOW);

      // Add self as listener
      fakeLocalStorage.setItem(OWN_MESSAGE_LISTENER, RECENTLY);

      // Add outdated message
      fakeLocalStorage.setItem(OTHER_MESSAGE, LONG_AGO);

      // Add other inactive listener
      fakeLocalStorage.setItem(OTHER_LISTENER, LONG_AGO);

      sandbox.spy(fakeLocalStorage, 'removeItem');

      transport = new StorageMessenger.Transport(fakeLocalStorage,
          'own-target-id');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should remove outdated message', function() {
      transport.removeGarbage();
      expect(fakeLocalStorage.removeItem).was.calledWith(OTHER_MESSAGE);
    });

    it('should remove inactive message listener', function() {
      transport.removeGarbage();
      expect(fakeLocalStorage.removeItem).was.calledWith(OTHER_LISTENER);
    });

    it('should not remove own message listener', function() {
      transport.removeGarbage();
      expect(fakeLocalStorage.removeItem).was
          .neverCalledWith(OWN_MESSAGE_LISTENER);
    });
  });

  describe('destruction off transport with own message listener in ' +
      'localStorage', function() {
    var sandbox;
    var clock;
    var fakeLocalStorage;
    var transport;
    var storageEventTarget = 'onstorage' in document ? document : window;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();
      clock = sinon.useFakeTimers(NOW);

      // Add self as listener
      fakeLocalStorage.setItem(OWN_MESSAGE_LISTENER, RECENTLY);

      sandbox.spy(StorageMessenger.DOM, 'off');
      sandbox.spy(fakeLocalStorage, 'removeItem');
      sandbox.spy(fakeLocalStorage, 'setItem');
      transport = new StorageMessenger.Transport(fakeLocalStorage,
          'own-target-id');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should remove DOM storage event listener', function() {
      transport.destroy();
      expect(StorageMessenger.DOM.off).was.calledWith(storageEventTarget,
          'storage', transport.storageListener);
    });

    it('should remove DOM unload event listener', function() {
      transport.destroy();
      expect(StorageMessenger.DOM.off).was.calledWith(window,
          'unload', transport.unloadListener);
    });

    it('should remove own message listener from localStorage', function() {
      transport.destroy();
      expect(fakeLocalStorage.removeItem).was.calledWith(OWN_MESSAGE_LISTENER);
    });

    it('should clear keep alive interval', function() {
      transport.registerOwnMessageListener();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledTwice();

      transport.destroy();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledTwice();
    });
  });

  describe('registration off transport with own message listener in ' +
      'localStorage', function() {
    var sandbox;
    var clock;
    var fakeLocalStorage;
    var transport;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeLocalStorage = FakeLocalStorage.create();
      clock = sandbox.useFakeTimers(NOW);

      // Add self as listener
      fakeLocalStorage.setItem(OWN_MESSAGE_LISTENER, RECENTLY);

      sandbox.spy(fakeLocalStorage, 'setItem');
      transport = new StorageMessenger.Transport(fakeLocalStorage,
          'own-target-id');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should register own message listener', function() {
      transport.registerOwnMessageListener();
      expect(fakeLocalStorage.setItem).was
          .calledWith(OWN_MESSAGE_LISTENER, NOW);
    });

    it('should keep own message listener alive', function() {
      transport.registerOwnMessageListener();
      expect(fakeLocalStorage.setItem).was.calledOnce();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledTwice();
      clock.tick(400);
      expect(fakeLocalStorage.setItem).was.calledThrice();
    });
  });
});
