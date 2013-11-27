describe('Transport instance', function() {
  var StorageMessenger = window.StorageMessenger;
  var FIRST_ITEM = {
    key: 'first-key',
    value: 'first-value'
  };
  var SECOND_ITEM = {
    key: 'second-key',
    value: 'second-value'
  };
  var transport;
  var mockStorage;
  var clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers(1234567890);

    sinon.spy(Function.prototype, 'bind');
    sinon.spy(StorageMessenger.Transport.prototype,
        '_registerSelfAsMessageListener');
    sinon.spy(StorageMessenger.Transport.prototype,
        '_removeGarbageMessageListenersAndMessages');
    sinon.spy(StorageMessenger, '_addDomEventListener');
    sinon.stub(StorageMessenger, '_guid').returns('mock-guid');

    mockStorage = {
      setItem: function () {},
      removeItem: function () {},
      key: function() {},
      getItem: function() {},
      clear: function() {},
      length: 0
    };

    transport = new StorageMessenger.Transport(mockStorage);
  });

  afterEach(function() {
    clock.restore();
    Function.prototype.bind.restore();
    StorageMessenger.Transport.prototype._registerSelfAsMessageListener
        .restore();
    StorageMessenger.Transport.prototype
        ._removeGarbageMessageListenersAndMessages.restore();
    StorageMessenger._guid.restore();
    StorageMessenger._addDomEventListener.restore();
  });

  it('should have correct storage', function() {
    expect(transport._storage).to.be(mockStorage);
  });

  it('should have correct own target id', function() {
    expect(transport._ownTargetId).to.be('mock-guid');
  });

  it('should have correct message listener key', function() {
    expect(transport._MESSAGE_LISTENER_KEY).to.be('{"tag":"8cc00beb-0' +
        '943-41e8-9bbf-a74f91e3679e","targetId":"mock-guid"}');
  });

  it('should have correct transport listeners', function() {
    expect(transport._transportListeners).to.eql([]);
  });

  it('should bind DOM storage event listeners', function() {
    expect(transport._domStorageEventListener.bind.calledWith(transport)).to
        .be(true);
  });

  it('should bind unregister self as message listener', function() {
    expect(transport._unregisterSelfAsMessageListener.bind
        .calledWith(transport)).to.be(true);
  });

  it('should listen for storage events', function() {
    expect(StorageMessenger._addDomEventListener.calledWith(window, 'storage',
        transport._domStorageEventListener)).to.be(true);
  });

  it('should listen for unload events', function() {
    expect(StorageMessenger._addDomEventListener.calledWith(window, 'unload',
        transport._unregisterSelfAsMessageListener)).to.be(true);
  });

  it('should register self as storage message listener', function() {
    expect(transport._registerSelfAsMessageListener.called).to.be(true);
  });

  it('should register self as storage message listener on interval',
      function() {
    clock.tick(StorageMessenger._ITEM_TTL_MS * 2);
    expect(transport._registerSelfAsMessageListener.calledThrice).to
        .be(true);
  });

  it('should clean up garbage', function() {
    expect(transport._removeGarbageMessageListenersAndMessages.called).to
        .be(true);
  });

  describe('trigger', function() {
    var store;

    beforeEach(function() {
      store = sinon.spy();
      sinon.stub(transport, '_getOtherMessageListeners').returns([
        {
          targetId: 'foo'
        }, {
          targetId: 'bar'
        }
      ]);

      sinon.stub(StorageMessenger, 'Message').returns({
        store: store
      });
    });

    afterEach(function() {
      StorageMessenger.Message.restore();
    });

    it('should create new message instance for each message listener',
        function() {
      transport.trigger('event', 'params');

      expect(StorageMessenger.Message.calledTwice).to.be(true);
      expect(StorageMessenger.Message.firstCall.calledWithNew()).to.be(true);
      expect(StorageMessenger.Message.secondCall.calledWithNew()).to.be(true);
    });

    it('should call message constructor with correct arguments', function() {
      transport.trigger('event', 'params');

      expect(StorageMessenger.Message.firstCall.args[0]).to
          .be(transport._storage);
      expect(StorageMessenger.Message.firstCall.args[1].event).to.be('event');
      expect(StorageMessenger.Message.firstCall.args[1].params).to.be('params');
      expect(StorageMessenger.Message.firstCall.args[1].targetId).to.be('foo');

      expect(StorageMessenger.Message.secondCall.args[0]).to
          .be(transport._storage);
      expect(StorageMessenger.Message.secondCall.args[1].event).to.be('event');
      expect(StorageMessenger.Message.secondCall.args[1].params).to
          .be('params');
      expect(StorageMessenger.Message.secondCall.args[1].targetId).to.be('bar');
    });

    it('should store messages', function() {
      transport.trigger('event', 'params');

      expect(store.calledTwice).to.be(true);
    });
  });

  describe('listen', function() {
    var event = 'event';
    var listener = function() {};
    var context = {};

    it('should add transport listener', function() {
      transport.listen(event, listener, context);
      expect(transport._transportListeners).to.eql([
        {
          event: event,
          listener: listener,
          context: context
        }
      ]);
    });
  });

  describe('ignore', function() {
    var firstEvent = 'event';
    var firstListener = function() {};
    var firstContext = {context: 1};

    var secondEvent = 'event';
    var secondListener = function() {};
    var secondContext = {context: 2};

    beforeEach(function() {
      transport._transportListeners = [
        {
          event: firstEvent,
          listener: firstListener,
          context: firstContext
        }, {
          event: secondEvent,
          listener: secondListener,
          context: secondContext
        }
      ];
    });

    it('should remove transport listener', function() {
      transport.ignore(firstEvent, firstListener, firstContext);
      expect(transport._transportListeners).to.eql([
        {
          event: secondEvent,
          listener: secondListener,
          context: {context: 2}
        }
      ]);
    });

    it('should not remove transport listener if unknown event', function() {
      transport.ignore(null, firstListener, firstContext);
      expect(transport._transportListeners.length).to.be(2);
    });

    it('should not remove transport listener if unknown listener', function() {
      transport.ignore(firstEvent, null, firstContext);
      expect(transport._transportListeners.length).to.be(2);
    });

    it('should not remove transport listener if unknown context', function() {
      transport.ignore(firstEvent, firstListener, null);
      expect(transport._transportListeners.length).to.be(2);
    });
  });

  describe('_forEachItemInStorage', function() {
    var callback;
    var context;

    beforeEach(function() {
      transport._storage.length = 2;
      sinon.stub(transport._storage, 'key', function(i) {return i + '-key';});
      sinon.stub(transport._storage, 'getItem', function(key) {
        return key + '-value';
      });
      callback = sinon.spy();
      context = {};
    });

    it('should apply callback for each item in storage', function() {
      transport._forEachItemInStorage(callback);
      expect(callback.calledTwice).to.be(true);
    });

    it('should apply callback for each item in storage with item as argument',
        function() {
      transport._forEachItemInStorage(callback);

      expect(callback.firstCall.args[0].key).to.be('0-key');
      expect(callback.firstCall.args[0].value).to.be('0-key-value');
      expect(callback.secondCall.args[0].key).to.be('1-key');
      expect(callback.secondCall.args[0].value).to.be('1-key-value');
    });

    it('should apply callback for each item in storage with correct context',
        function() {
      transport._forEachItemInStorage(callback, context);
      expect(callback.alwaysCalledOn(context)).to.be(true);
    });
  });

  describe('_getMessagesFromStorage', function() {
    describe('with empty storage', function() {
      beforeEach(function() {
        sinon.stub(transport, '_forEachItemInStorage').returns();
      });

      it('should return empty array', function() {
        expect(transport._getMessagesFromStorage('targetId')).to.eql([]);
      });
    });

    describe('with items in storage', function() {
      beforeEach(function() {
        var getMessageWithTargetIdFromItemStub = sinon.stub(transport,
            '_getMessageWithTargetIdFromItem');

        getMessageWithTargetIdFromItemStub.withArgs(FIRST_ITEM,'target-id')
            .returns('message');
        getMessageWithTargetIdFromItemStub.withArgs(SECOND_ITEM, 'target-id')
            .returns(null);

        sinon.stub(transport, '_forEachItemInStorage',
            function(callback, context) {
          callback.call(context, FIRST_ITEM);
          callback.call(context, SECOND_ITEM);
        });

        sinon.stub(mockStorage, 'removeItem');
      });

      it('should get messages with target id from item', function() {
        transport._getMessagesFromStorage('target-id');
        expect(transport._getMessageWithTargetIdFromItem.calledTwice).to
            .be(true);
        expect(transport._getMessageWithTargetIdFromItem.firstCall
            .calledWith(FIRST_ITEM, 'target-id')).to.be(true);
        expect(transport._getMessageWithTargetIdFromItem.secondCall
            .calledWith(SECOND_ITEM, 'target-id')).to.be(true);
      });

      it('should remove item key from storage', function() {
        transport._getMessagesFromStorage('target-id');
        expect(transport._storage.removeItem.calledOnce).to.be(true);
        expect(transport._storage.removeItem.firstCall.calledWith('first-key'))
            .to.be(true);
      });

      it('should return correct messages', function() {
        expect(transport._getMessagesFromStorage('target-id')).to
            .eql(['message']);
      });
    });
  });

  describe('_removeMessagesFromStorage', function() {
    beforeEach(function() {
      var itemContainsMessageWithTargetIdStub = sinon.stub(StorageMessenger,
          '_itemContainsMessageWithTargetId');

      itemContainsMessageWithTargetIdStub.withArgs(FIRST_ITEM,'target-id')
          .returns(true);
      itemContainsMessageWithTargetIdStub.withArgs(SECOND_ITEM, 'target-id')
          .returns(false);

      sinon.stub(transport, '_forEachItemInStorage',
          function(callback, context) {
        callback.call(context, FIRST_ITEM);
        callback.call(context, SECOND_ITEM);
      });

      sinon.spy(transport._storage, 'removeItem');
    });

    afterEach(function() {
      transport._storage.removeItem.restore();
      StorageMessenger._itemContainsMessageWithTargetId.restore();
    });

    it('should check if item contains message with target id', function() {
      transport._removeMessagesFromStorage('target-id');
      expect(StorageMessenger._itemContainsMessageWithTargetId.calledTwice)
          .to.be(true);
      expect(StorageMessenger._itemContainsMessageWithTargetId.firstCall
          .calledWith(FIRST_ITEM, 'target-id')).to.be(true);
      expect(StorageMessenger._itemContainsMessageWithTargetId.secondCall
          .calledWith(SECOND_ITEM, 'target-id')).to.be(true);
    });

    it('should remove item key from storage', function() {
      transport._removeMessagesFromStorage('target-id');
      expect(transport._storage.removeItem.calledOnce).to.be(true);
      expect(transport._storage.removeItem.firstCall.calledWith('first-key'))
          .to.be(true);
    });
  });

  describe('_domStorageEventListener', function() {
    beforeEach(function() {
      sinon.spy(transport, '_getOwnMessagesFromStorage');
    });

    it('should not get own messages from storage if event contains key ' +
        'but not newValue', function() {
      transport._domStorageEventListener({
        key: 'key'
      });
      expect(transport._getOwnMessagesFromStorage.called).to.be(false);
    });

    it('should get own messages from storage if event contains both key and ' +
        'newValue', function() {
      transport._domStorageEventListener({
        key: 'key',
        newValue: 'newValue'
      });
      expect(transport._getOwnMessagesFromStorage
          .calledWith(transport._applyTransportListeners, transport)).to
          .be(true);
    });

    it('should get own messages from storage if event contains neither key ' +
        'nor newValue', function() {
      transport._domStorageEventListener({});
      expect(transport._getOwnMessagesFromStorage
          .calledWith(transport._applyTransportListeners, transport)).to
          .be(true);
    });
  });

  describe('_getOwnMessagesFromStorage', function() {
    var callback;
    var context = {};

    beforeEach(function() {
      sinon.stub(transport, '_getMessagesFromStorage').returns('mock-messages');
      callback = sinon.spy();
    });

    it('should not get all messages synchronously', function() {
      transport._getOwnMessagesFromStorage(callback, context);
      expect(transport._getMessagesFromStorage.called).to.be(false);
    });

    it('should get all messages asynchronously', function() {
      transport._getOwnMessagesFromStorage(callback, context);
      clock.tick(1);
      expect(transport._getMessagesFromStorage.called).to.be(true);
    });

    it('should apply callback with messages asynchronously', function() {
      transport._getOwnMessagesFromStorage(callback, context);
      clock.tick(1);
      expect(callback.calledWith('mock-messages')).to.be(true);
    });

    it('should apply callback with correct context', function() {
      transport._getOwnMessagesFromStorage(callback, context);
      clock.tick(1);
      expect(callback.alwaysCalledOn(context)).to.be(true);
    });
  });

  describe('_applyTransportListeners', function() {
    var contex = {};
    var listener;

    beforeEach(function() {
      listener = sinon.spy();

      transport._transportListeners = [{
        event: 'event',
        listener: listener,
        context: context
      }];
    });

    it('should apply listener if listener event matches message event',
        function() {
      transport._applyTransportListeners([{
        event: 'event',
        params: 'params'
      }]);
      expect(listener.calledWith('params')).to.be(true);
    });

    it('should apply listener with correct context', function() {
      transport._applyTransportListeners([{
        event: 'event',
        params: 'params'
      }]);
      expect(listener.alwaysCalledOn(context)).to.be(true);
    });

    it('should not apply listener if event do not match message event',
        function() {
      transport._applyTransportListeners([{
        event: 'unknown',
        params: 'params'
      }]);
      expect(listener.called).to.be(false);
    });
  });

  describe('_getOtherMessageListeners', function() {
    describe('with empty storage', function() {
      beforeEach(function() {
        sinon.stub(transport, '_forEachItemInStorage').returns();
      });

      afterEach(function() {
        transport._forEachItemInStorage.restore();
      });

      it('should return empty array', function() {
        expect(transport._getOtherMessageListeners()).to.eql([]);
      });
    });

    describe('with items in storage', function() {
      beforeEach(function() {
        var getOtherMessageListenerFromItemStub = sinon.stub(transport,
            '_getOtherMessageListenerFromItem');
        getOtherMessageListenerFromItemStub.withArgs(FIRST_ITEM)
            .returns('listener');
        getOtherMessageListenerFromItemStub.withArgs(SECOND_ITEM)
            .returns(null);

        sinon.stub(transport, '_forEachItemInStorage',
            function(callback, context) {
          callback.call(context, FIRST_ITEM);
          callback.call(context, SECOND_ITEM);
        });
      });

      it('should get other message listeners from item', function() {
        transport._getOtherMessageListeners();
        expect(transport._getOtherMessageListenerFromItem.calledTwice).to
            .be(true);
        expect(transport._getOtherMessageListenerFromItem.firstCall
            .calledWith(FIRST_ITEM)).to.be(true);
        expect(transport._getOtherMessageListenerFromItem.secondCall
            .calledWith(SECOND_ITEM)).to.be(true);
      });

      it('should return listeners', function() {
        expect(transport._getOtherMessageListeners()).to.eql(['listener']);
      });
    });
  });

  describe('_removeGarbageMessageListenersAndMessages', function() {
    beforeEach(function() {
      var getGarbagMessageListenerFromItemStub = sinon.stub(transport,
          '_getGarbageMessageListenerFromItem');
      getGarbagMessageListenerFromItemStub.withArgs(FIRST_ITEM).returns({
        targetId: 'garbage-listener-id'
      });
      getGarbagMessageListenerFromItemStub.withArgs(SECOND_ITEM).returns(null);

      sinon.stub(transport, '_forEachItemInStorage',
          function(callback, context) {
        callback.call(context, FIRST_ITEM);
        callback.call(context, SECOND_ITEM);
      });
      sinon.stub(mockStorage, 'removeItem');
      sinon.stub(transport, '_removeMessagesFromStorage');
    });

    it('should get garbage message listener from item', function() {
      transport._removeGarbageMessageListenersAndMessages();
      expect(transport._getGarbageMessageListenerFromItem.calledTwice).to
          .be(true);
      expect(transport._getGarbageMessageListenerFromItem.firstCall
          .calledWith(FIRST_ITEM)).to.be(true);
      expect(transport._getGarbageMessageListenerFromItem.secondCall
          .calledWith(SECOND_ITEM)).to.be(true);
    });

    it('should remove garbage listener\'s messages from storage', function() {
      transport._removeGarbageMessageListenersAndMessages();
      expect(transport._removeMessagesFromStorage.calledOnce).to.be(true);
      expect(transport._removeMessagesFromStorage
          .calledWith('garbage-listener-id')).to.be(true);
    });

    it('should item key from storage', function() {
      transport._removeGarbageMessageListenersAndMessages();
      expect(transport._storage.removeItem.calledOnce).to.be(true);
      expect(transport._storage.removeItem.calledWith('first-key'))
          .to.be(true);
    });
  });

  describe('_getMessageWithTargetIdFromItem', function() {
    beforeEach(function() {
      var itemContainsMessageWithTargetIdStub = sinon.stub(StorageMessenger,
          '_itemContainsMessageWithTargetId');
      itemContainsMessageWithTargetIdStub.withArgs(FIRST_ITEM, 'target-id')
          .returns(true);
      itemContainsMessageWithTargetIdStub.withArgs(SECOND_ITEM, 'target-id')
          .returns(false);
      sinon.stub(StorageMessenger, '_unmarshalItem').returns('unmarshalled-item');
    });

    afterEach(function() {
      StorageMessenger._itemContainsMessageWithTargetId.restore();
      StorageMessenger._unmarshalItem.restore();
    });

    it('should check if item contains message with target id', function() {
      transport._getMessageWithTargetIdFromItem(FIRST_ITEM, 'target-id');
      expect(StorageMessenger._itemContainsMessageWithTargetId
          .calledWith(FIRST_ITEM, 'target-id')).to.be(true);
    });

    it('should return unmarshalled item if item contains message with ' +
        'target id', function() {
      expect(transport._getMessageWithTargetIdFromItem(FIRST_ITEM,
          'target-id')).to.be('unmarshalled-item');
    });

    it('should return null if item does not contain messag with target id',
        function() {
      expect(transport._getMessageWithTargetIdFromItem(SECOND_ITEM,
          'target-id')).to.be(null);
    });
  });

  describe('_getGarbageMessageListenerFromItem', function() {
    beforeEach(function() {
      var isItemGarbageMessageListenerStub = sinon.stub(transport,
          '_isItemGarbageMessageListener');
      isItemGarbageMessageListenerStub.withArgs(FIRST_ITEM).returns(true);
      isItemGarbageMessageListenerStub.withArgs(SECOND_ITEM).returns(false);
      sinon.stub(StorageMessenger, '_unmarshalItem').returns('unmarshalled-item');
    });

    afterEach(function() {
      StorageMessenger._unmarshalItem.restore();
    });

    it('should check if item is garbage message listener', function() {
      transport._getGarbageMessageListenerFromItem(FIRST_ITEM);
      expect(transport._isItemGarbageMessageListener.calledWith(FIRST_ITEM)).to
          .be(true);
    });

    it('should return unmarshalled item if item is garbage message listener',
        function() {
      expect(transport._getGarbageMessageListenerFromItem(FIRST_ITEM)).to
          .be('unmarshalled-item');
    });

    it('should return null if item is not garbage message listener',
        function() {
      expect(transport._getGarbageMessageListenerFromItem(SECOND_ITEM)).to
          .be(null);
    });
  });

  describe('_getOtherMessageListenerFromItem', function() {
    beforeEach(function() {
      var isItemOtherMessageListener = sinon.stub(transport,
          '_isItemOtherMessageListener');
      isItemOtherMessageListener.withArgs(FIRST_ITEM).returns(true);
      isItemOtherMessageListener.withArgs(SECOND_ITEM).returns(false);
      sinon.stub(StorageMessenger, '_unmarshalItem').returns('unmarshalled-item');
    });

    afterEach(function() {
      StorageMessenger._unmarshalItem.restore();
    });

    it('should check if item is other message listener', function() {
      transport._getOtherMessageListenerFromItem(FIRST_ITEM);
      expect(transport._isItemOtherMessageListener.calledWith(FIRST_ITEM)).to
          .be(true);
    });

    it('should return unmarshalled item if item is other message listener',
        function() {
      expect(transport._getOtherMessageListenerFromItem(FIRST_ITEM)).to
          .be('unmarshalled-item');
    });

    it('should return null if item is not other message listener',
        function() {
      expect(transport._getOtherMessageListenerFromItem(SECOND_ITEM)).to
          .be(null);
    });
  });

  describe('_isItemGarbageMessageListener', function() {
    describe('item contains message listener, is garbage, and does not ' +
        'contain own target id', function() {
      beforeEach(function() {
        sinon.stub(StorageMessenger, '_itemContainsMessageListener')
            .returns(true);
        sinon.stub(StorageMessenger, '_isGarbageItem').returns(true);
        sinon.stub(StorageMessenger, '_itemContainsTargetId').returns(false);
      });

      afterEach(function() {
        StorageMessenger._itemContainsMessageListener.restore();
        StorageMessenger._isGarbageItem.restore();
        StorageMessenger._itemContainsTargetId.restore();
      });

      it('should check if item contains message listener', function() {
        transport._isItemGarbageMessageListener(FIRST_ITEM);
        expect(StorageMessenger._itemContainsMessageListener
            .calledWith(FIRST_ITEM)).to.be(true);
      });

      it('should check if item is garbage', function() {
        transport._isItemGarbageMessageListener(FIRST_ITEM);
        expect(StorageMessenger._isGarbageItem.calledWith(FIRST_ITEM)).to
            .be(true);
      });

      it('should check if item contains own target id', function() {
        transport._isItemGarbageMessageListener(FIRST_ITEM);
        expect(StorageMessenger._itemContainsTargetId.calledWith(FIRST_ITEM,
            transport._ownTargetId)).to.be(true);
      });

      it('should return true', function() {
        expect(transport._isItemGarbageMessageListener(FIRST_ITEM)).to.be(true);
      });
    });

    describe('item contains message listener, is garbage, and contains own ' +
        'target id', function() {
      beforeEach(function() {
        sinon.stub(StorageMessenger, '_itemContainsMessageListener')
            .returns(true);
        sinon.stub(StorageMessenger, '_isGarbageItem').returns(true);
        sinon.stub(StorageMessenger, '_itemContainsTargetId').returns(true);
      });

      afterEach(function() {
        StorageMessenger._itemContainsMessageListener.restore();
        StorageMessenger._isGarbageItem.restore();
        StorageMessenger._itemContainsTargetId.restore();
      });

      it('should return false', function() {
        expect(transport._isItemGarbageMessageListener(FIRST_ITEM)).to.be(false);
      });
    });

    describe('item contains message listener, is not garbage, and does not ' +
        'contain own target id', function() {
      beforeEach(function() {
        sinon.stub(StorageMessenger, '_itemContainsMessageListener')
            .returns(true);
        sinon.stub(StorageMessenger, '_isGarbageItem').returns(false);
        sinon.stub(StorageMessenger, '_itemContainsTargetId').returns(false);
      });

      afterEach(function() {
        StorageMessenger._itemContainsMessageListener.restore();
        StorageMessenger._isGarbageItem.restore();
        StorageMessenger._itemContainsTargetId.restore();
      });

      it('should return false', function() {
        expect(transport._isItemGarbageMessageListener(FIRST_ITEM)).to.be(false);
      });
    });

    describe('item does not contain message listener, is garbage, and does ' +
        'not contains own target id', function() {
      beforeEach(function() {
        sinon.stub(StorageMessenger, '_itemContainsMessageListener')
            .returns(false);
        sinon.stub(StorageMessenger, '_isGarbageItem').returns(true);
        sinon.stub(StorageMessenger, '_itemContainsTargetId').returns(false);
      });

      afterEach(function() {
        StorageMessenger._itemContainsMessageListener.restore();
        StorageMessenger._isGarbageItem.restore();
        StorageMessenger._itemContainsTargetId.restore();
      });

      it('should return false', function() {
        expect(transport._isItemGarbageMessageListener(FIRST_ITEM)).to.be(false);
      });
    });
  });

  describe('_isItemOtherMessageListener', function() {
    describe('item contains message listener, is not garbage, and does not ' +
        'contain own target id', function() {
      beforeEach(function() {
        sinon.stub(StorageMessenger, '_itemContainsMessageListener')
            .returns(true);
        sinon.stub(StorageMessenger, '_isGarbageItem').returns(false);
        sinon.stub(StorageMessenger, '_itemContainsTargetId').returns(false);
      });

      afterEach(function() {
        StorageMessenger._itemContainsMessageListener.restore();
        StorageMessenger._isGarbageItem.restore();
        StorageMessenger._itemContainsTargetId.restore();
      });

      it('should check if item contains message listener', function() {
        transport._isItemOtherMessageListener(FIRST_ITEM);
        expect(StorageMessenger._itemContainsMessageListener
            .calledWith(FIRST_ITEM)).to.be(true);
      });

      it('should check if item is garbage', function() {
        transport._isItemOtherMessageListener(FIRST_ITEM);
        expect(StorageMessenger._isGarbageItem.calledWith(FIRST_ITEM)).to
            .be(true);
      });

      it('should check if item contains own target id', function() {
        transport._isItemOtherMessageListener(FIRST_ITEM);
        expect(StorageMessenger._itemContainsTargetId.calledWith(FIRST_ITEM,
            transport._ownTargetId)).to.be(true);
      });

      it('should return true', function() {
        expect(transport._isItemOtherMessageListener(FIRST_ITEM)).to.be(true);
      });
    });

    describe('item contains message listener, is not garbage, and contains own ' +
        'target id', function() {
      beforeEach(function() {
        sinon.stub(StorageMessenger, '_itemContainsMessageListener')
            .returns(true);
        sinon.stub(StorageMessenger, '_isGarbageItem').returns(false);
        sinon.stub(StorageMessenger, '_itemContainsTargetId').returns(true);
      });

      afterEach(function() {
        StorageMessenger._itemContainsMessageListener.restore();
        StorageMessenger._isGarbageItem.restore();
        StorageMessenger._itemContainsTargetId.restore();
      });

      it('should return false', function() {
        expect(transport._isItemOtherMessageListener(FIRST_ITEM)).to.be(false);
      });
    });

    describe('item contains message listener, is garbage, and does not ' +
        'contain own target id', function() {
      beforeEach(function() {
        sinon.stub(StorageMessenger, '_itemContainsMessageListener')
            .returns(true);
        sinon.stub(StorageMessenger, '_isGarbageItem').returns(true);
        sinon.stub(StorageMessenger, '_itemContainsTargetId').returns(false);
      });

      afterEach(function() {
        StorageMessenger._itemContainsMessageListener.restore();
        StorageMessenger._isGarbageItem.restore();
        StorageMessenger._itemContainsTargetId.restore();
      });

      it('should return false', function() {
        expect(transport._isItemOtherMessageListener(FIRST_ITEM)).to.be(false);
      });
    });

    describe('item does not contain message listener, is not garbage, and does ' +
        'not contains own target id', function() {
      beforeEach(function() {
        sinon.stub(StorageMessenger, '_itemContainsMessageListener')
            .returns(false);
        sinon.stub(StorageMessenger, '_isGarbageItem').returns(false);
        sinon.stub(StorageMessenger, '_itemContainsTargetId').returns(false);
      });

      afterEach(function() {
        StorageMessenger._itemContainsMessageListener.restore();
        StorageMessenger._isGarbageItem.restore();
        StorageMessenger._itemContainsTargetId.restore();
      });

      it('should return false', function() {
        expect(transport._isItemOtherMessageListener(FIRST_ITEM)).to.be(false);
      });
    });
  });

  describe('_unregisterSelfAsMessageListener', function() {
    beforeEach(function() {
      sinon.stub(mockStorage, 'removeItem');
      transport._MESSAGE_LISTENER_KEY = 'message-listener-key';
    });

    it('should remove storage message listener from storage', function() {
      transport._unregisterSelfAsMessageListener();
      expect(transport._storage.removeItem.calledWith('message-listener-key'))
          .to.be(true);
    });
  });

  describe('_registerSelfAsMessageListener', function() {
    beforeEach(function() {
      sinon.stub(mockStorage, 'setItem');
      transport._MESSAGE_LISTENER_KEY = 'message-listener-key';
    });

    it('should remove storage message listener from storage', function() {
      transport._registerSelfAsMessageListener();
      expect(transport._storage.setItem.calledWith('message-listener-key',
          1234567890)).to.be(true);
    });
  });
});
