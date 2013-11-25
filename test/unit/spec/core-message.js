describe('Message instance', function() {
  var StorageMessenger = window.StorageMessenger;
  var mockStorage;
  var message;
  var clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers(1234567890);
    sinon.stub(StorageMessenger, '_guid').returns('guid');

    mockStorage = {
      setItem: sinon.spy()
    };

    message = new StorageMessenger.Message(mockStorage, {
      targetId: 'target-id',
      event: 'event',
      params: 'params'
    });
  });

  afterEach(function() {
    clock.restore();
    StorageMessenger._guid.restore();
  });

  it('should have correct storage', function() {
    expect(message._storage).to.be(mockStorage);
  });

  it('should have correct tag attribute', function() {
    expect(message._attributes.tag).to.be(StorageMessenger._MESSAGE_TAG);
  });

  it('should have correct message id attribute', function() {
    expect(message._attributes.messageId).to.be('guid');
  });

  it('should have correct target id attribute', function() {
    expect(message._attributes.targetId).to.be('target-id');
  });

  it('should have correct event attribute', function() {
    expect(message._attributes.event).to.be('event');
  });

  it('should have correct params attribute', function() {
    expect(message._attributes.params).to.be('params');
  });

  describe('toJson', function() {
    it('should JSON-serialize attributes', function() {
      expect(message.toJson()).to.be('{' +
          '"tag":"b6297eba-31e4-11e3-8cf6-ce3f5508acd9",' +
          '"messageId":"guid",' +
          '"targetId":"target-id",' +
          '"event":"event",' +
          '"params":"params"' +
          '}');
    });
  });

  describe('send', function() {
    beforeEach(function() {
      sinon.stub(message, 'toJson').returns('"json"');
    });

    it('should store message in storage', function() {
      message.store();
      expect(message._storage.setItem.calledWith('"json"', 1234567890)).to.be(true);
    });
  });
});
