describe('StorageMessenger', function () {
  var StorageMessenger = window.StorageMessenger;
  var guidPattern = /^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$/;
  var mockTarget;
  var mockListener;

  beforeEach(function() {
    mockTarget = {
      addEventListener: sinon.spy(),
      attachEvent: sinon.spy(),
      removeEventListener: sinon.spy(),
      detachEvent: sinon.spy()
    };

    mockListener = sinon.spy();

    sinon.spy(StorageMessenger, '_stringContains');
  });

  afterEach(function() {
    StorageMessenger._stringContains.restore();
  });

  it('should have correct version', function () {
    expect(StorageMessenger.VERSION).to.be('@VERSION@');
  });

  it('should gave correct message tag', function() {
    expect(StorageMessenger._MESSAGE_TAG).to
        .be('b6297eba-31e4-11e3-8cf6-ce3f5508acd9');
  });

  it('should have have correct listener tag', function() {
    expect(StorageMessenger._MESSAGE_LISTENER_TAG).to
        .be('8cc00beb-0943-41e8-9bbf-a74f91e3679e');
  });

  it('should have correct item time to to live milliseconds', function() {
    expect(StorageMessenger._ITEM_TTL_MS).to.be(400);
  });

  it('should have reference to previous `StorageMessenger` global', function() {
    expect(StorageMessenger._previousStorageMessenger).to.be(undefined);
  });

  describe('noConflict', function() {
    it('should remove `StorageMessenger` from global object', function() {
      StorageMessenger.noConflict();
      expect(window.StorageMessenger).to.be(undefined);
    });

    it('should return `StorageMessenger` when calling `noConflict`', function() {
      expect(StorageMessenger.noConflict()).to.be(StorageMessenger);
    });
  });

  describe('_isGarbageItem', function() {
    it('should not treat recent item as garbage', function() {
      expect(StorageMessenger._isGarbageItem({
        value: +new Date()
      })).to.be(false);
    });

    it('should treat old item as garbage', function() {
      expect(StorageMessenger._isGarbageItem({
        value: +new Date() - 500
      })).to.be(true);
    });
  });

  describe('_itemContainsMessageWithTargetId', function() {
    beforeEach(function() {
      var itemContainsMessageStub = sinon.stub(StorageMessenger,
          '_itemContainsMessage');
      var itemContainsTargetIdStub = sinon.stub(StorageMessenger,
          '_itemContainsTargetId');

      itemContainsMessageStub.withArgs('item-with-message').returns(true);
      itemContainsMessageStub.withArgs('item-without-message').returns(false);

      itemContainsTargetIdStub.withArgs('item-with-message',
          'containing-target-id').returns(true);
      itemContainsTargetIdStub.withArgs('item-with-message',
          'missing-target-id').returns(false);
    });

    afterEach(function() {
      StorageMessenger._itemContainsMessage.restore();
      StorageMessenger._itemContainsTargetId.restore();
    });

    it('should always check if item contains message', function() {
      StorageMessenger._itemContainsMessageWithTargetId('item-without-message',
          'missing-target-id');
      expect(StorageMessenger._itemContainsMessage
          .calledWith('item-without-message')).to.be(true);
    });

    it('should check if item contains target id if item contains message',
        function() {
      StorageMessenger._itemContainsMessageWithTargetId('item-with-message',
          'missing-target-id');
      expect(StorageMessenger._itemContainsTargetId
          .calledWith('item-with-message', 'missing-target-id')).to.be(true);
    });

    it('should return true if item contains message and item contains ' +
        'target id', function() {
      expect(StorageMessenger._itemContainsMessageWithTargetId(
          'item-with-message', 'containing-target-id')).to.be(true);
    });

    it('should return false if item does not contain message and item ' +
        'contains target id', function() {
      expect(StorageMessenger._itemContainsMessageWithTargetId(
          'item-without-message', 'containing-target-id')).to.be(false);
    });

    it('should return false if item contains message and item does not' +
        'contain target id', function() {
      expect(StorageMessenger._itemContainsMessageWithTargetId(
          'item-with-message', 'missing-target-id')).to.be(false);
    });
  });

  describe('_itemContainsMessage', function() {
    it('should check if item contains storage message', function() {
      StorageMessenger._itemContainsMessage({key: 'key'});
      expect(StorageMessenger._stringContains
          .calledWith(StorageMessenger._MESSAGE_TAG, 'key')).to.be(true);
    });
  });

  describe('_itemContainsMessageListener', function() {
    it('should check if item contains storage message listener', function() {
      StorageMessenger._itemContainsMessageListener({ key: 'foo'});
      expect(StorageMessenger._stringContains.calledWith(
          StorageMessenger._MESSAGE_LISTENER_TAG, 'foo')).to.be(true);
    });
  });

  describe('_itemContainsTargetId', function() {
    it('should check if item contains target id', function() {
      StorageMessenger._itemContainsTargetId({key: 'key'}, 'target-id');
      expect(StorageMessenger._stringContains.calledWith('key', 'target-id'));
    });
  });

  describe('_stringContains', function() {
    it('should find `hay` in `haystack`', function() {
      expect(StorageMessenger._stringContains('hay', 'haystack')).to.be(true);
    });

    it('should not find `needle` in an array', function() {
      expect(StorageMessenger._stringContains('needle', ['needle'])).to.be(false);
    });

    it('should not find `needle` in `haystack`', function() {
      expect(StorageMessenger._stringContains('needle', 'haystack')).to.be(false);
    });
  });

  describe('_guid', function() {
    it('should generate a guid', function() {
      expect(guidPattern.test(StorageMessenger._guid())).to.be(true);
    });
  });

  describe('_unmarshalItem', function() {
    beforeEach(function() {
      var parseStub = sinon.stub(JSON, 'parse');
      parseStub.withArgs('valid-json').returns('object');
      parseStub.withArgs('invalid-json').throws();
    });

    afterEach(function() {
      JSON.parse.restore();
    });

    it('should return object for valid json', function() {
      expect(StorageMessenger._unmarshalItem({key: 'valid-json'})).to
          .be('object');
    });

    it('should return null for invalid json', function() {
      expect(StorageMessenger._unmarshalItem({key: 'invalid-json'})).to
          .be(null);
    });
  });

  describe('_addDomEventListener', function() {
    var previousAttachEvent;

    beforeEach(function() {
      if (window.addEventListener) {
        sinon.spy(window, 'addEventListener');
      } else if (window.attachEvent) {
        // Workaround for IE8 where attachEvent is not of function type, meaning
        // that Sinon will not be able to spy on it.
        previousAttachEvent = document.attachEvent;
        document.attachEvent = function() {};

        sinon.spy(document, 'attachEvent');
      }
    });

    afterEach(function() {
      if (window.addEventListener) {
        window.addEventListener.restore();
      } else if (window.attachEvent) {
        document.attachEvent.restore();
        document.attachEvent = previousAttachEvent;
      }
    });

    it('should add DOM event listener', function() {
      StorageMessenger._addDomEventListener(mockTarget, 'event-type',
          mockListener);

      if (window.addEventListener) {
        expect(mockTarget.addEventListener.calledWith('event-type', mockListener,
            false)).to.be(true);
      } else if (window.attachEvent) {
        expect(mockTarget.attachEvent.calledWith('onevent-type',
            mockListener)).to.be(true);
      }
    });

    it('should add listener for storage event on correct target', function() {
      StorageMessenger._addDomEventListener(window, 'storage', mockListener);

      if (window.addEventListener) {
        expect(window.addEventListener.calledWith('storage', mockListener,
            false)).to.be(true);
      } else if (window.attachEvent) {
        expect(document.attachEvent.calledWith('onstorage', mockListener)).to
            .be(true);
      }
    });
  });

  describe('_removeDomEventListener', function() {
    var previousDetachEvent;

    beforeEach(function() {
      if (window.addEventListener) {
        sinon.spy(window, 'removeEventListener');
      } else if (window.attachEvent) {
        // Workaround for IE8 where attachEvent is not of function type, meaning
        // that Sinon will not be able to spy on it.
        previousDetachEvent = document.detachEvent;
        document.detachEvent = function() {};

        sinon.spy(document, 'detachEvent');
      }
    });

    afterEach(function() {
      if (window.addEventListener) {
        window.removeEventListener.restore();
      } else if (window.attachEvent) {
        document.detachEvent.restore();
        document.detachEvent = previousDetachEvent;
      }
    });

    it('should remove DOM event listener', function() {
      StorageMessenger._removeDomEventListener(mockTarget, 'event-type',
          mockListener);

      if (window.addEventListener) {
        expect(mockTarget.removeEventListener.calledWith('event-type',
            mockListener, false)).to.be(true);
      } else if (window.attachEvent) {
        expect(mockTarget.detachEvent.calledWith('onevent-type',
            mockListener)).to.be(true);
      }
    });

    it('should remove listener for storage event from correct target', function() {
      StorageMessenger._removeDomEventListener(window, 'storage', mockListener);

      if (window.addEventListener) {
        expect(window.removeEventListener.calledWith('storage', mockListener,
            false)).to.be(true);
      } else if (window.attachEvent) {
        expect(document.detachEvent.calledWith('onstorage', mockListener)).to
            .be(true);
      }
    });
  });
});
