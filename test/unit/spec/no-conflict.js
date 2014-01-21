describe('noConflict', function() {
  var globalStorageMessenger = window.StorageMessenger;

  afterEach(function() {
    window.StorageMessenger = globalStorageMessenger;
  });

  it('should restore previous value of global StorageMessenger', function() {
    StorageMessenger.noConflict();

    // See spec-helper/global-storage-messenger-definition.js
    expect(window.StorageMessenger).to.be('global-storage-messenger');
  });

  it('should return StorageMessenger', function() {
    expect(StorageMessenger.noConflict()).to.be(globalStorageMessenger)
  });
});
