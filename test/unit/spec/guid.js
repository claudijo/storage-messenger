describe('guid', function() {
  var guidRegExp = /^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$/;

  it('should generate something that looks like a version 4 GUID', function() {
    expect(StorageMessenger.guid()).to.match(guidRegExp);
  });
});
