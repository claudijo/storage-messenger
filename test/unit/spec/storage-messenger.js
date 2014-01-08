describe('StorageMessenger', function() {
  var DOM_EVENT_LISTENER = function() {};

  describe('version', function() {
    it('should have correct version placeholder', function() {
      expect(StorageMessenger.VERSION).to.be('@VERSION@');
    });
  });

  describe('guid', function() {
    var guidRegExp = /^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$/;

    it('should return valid guid', function() {
      expect(StorageMessenger.guid()).to.match(guidRegExp);
    });
  });

  describe('restore previous global object', function() {
    var StorageMessenger = window.StorageMessenger;

    afterEach(function() {
      window.StorageMessenger = StorageMessenger;
    });

    it('should return StorageMessenger when calling noConflict', function() {
      expect(StorageMessenger.noConflict()).to.be(StorageMessenger);
    });

    it('should restore previous value of global StorageMessenger when calling' +
        ' noConflict', function() {
      StorageMessenger.noConflict();

      // See define-global-storage-messenger.js
      expect(window.StorageMessenger).to
          .be('some-other-global-storage-messenger');
    });
  });

  describe('DOM', function() {
    var domEventTarget = {
      addEventListener: function() {},
      attachEvent: function() {},
      removeEventListener: function() {},
      detachEvent: function() {}
    };

    describe('on', function() {
      var mockDomEventTarget;

      beforeEach(function() {
        mockDomEventTarget = sinon.mock(domEventTarget);
        if (window.addEventListener) {
          mockDomEventTarget.expects('addEventListener')
              .withExactArgs('event', DOM_EVENT_LISTENER, false);
        } else {
          mockDomEventTarget.expects('attachEvent')
              .withExactArgs('event', DOM_EVENT_LISTENER);
        }
      });

      it('should add event listener', function() {
        StorageMessenger.DOM.on(domEventTarget, 'event', DOM_EVENT_LISTENER);
        mockDomEventTarget.verify();
      });
    });

    describe('off', function() {
      var mockDomEventTarget;

      beforeEach(function() {
        mockDomEventTarget = sinon.mock(domEventTarget);
        if (window.removeEventListener) {
          mockDomEventTarget.expects('removeEventListener')
              .withExactArgs('event', DOM_EVENT_LISTENER, false);
        } else {
          mockDomEventTarget.expects('detachEvent')
              .withExactArgs('event', DOM_EVENT_LISTENER);
        }
      });

      it('should remove event listener', function() {
        StorageMessenger.DOM.off(domEventTarget, 'event', DOM_EVENT_LISTENER);
        mockDomEventTarget.verify();
      });
    });
  });
});
