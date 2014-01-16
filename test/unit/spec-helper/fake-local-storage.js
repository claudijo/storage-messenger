var FakeLocalStorage = function(items, keys, length) {
  this.__keys__ = keys;
  this.__items__ = items;
  this.length = length;
};

FakeLocalStorage.create = function(items) {
  var keys = [];
  items = items || {};

  for (var key in items) {
    keys.push(key);
  }
  return new FakeLocalStorage(items, keys, keys.length);
};

FakeLocalStorage.prototype = {
  setItem: function(key, value) {
    if (!this.__items__.hasOwnProperty(key)) {
      this.__keys__.push(key);
    }
    this.__items__[key] = value;
    this.length = this.__keys__.length;
  },
  getItem: function(key) {
    return this.__items__[key];
  },
  key: function(index) {
    return this.__keys__[index];
  },
  removeItem: function(key) {
    var i = this.__keys__.length;
    delete this.__items__[key];
    while(i--) {
      if (key === this.__keys__[i]) {
        this.__keys__.splice(i, 1);
      }
    }
    this.length = this.__keys__.length;
  }
};
