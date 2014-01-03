var FakeLocalStorage = function(items, keys, length) {
  this.keys_ = keys;
  this.items_ = items;
  this.length = length;
};

FakeLocalStorage.create = function(items) {
  var keys = [];
  items = items || {};

  for (var key in items) {
    console.log(key);
    keys.push(key);
  }
  return new FakeLocalStorage(items, keys, keys.length);
};

FakeLocalStorage.prototype = {
  setItem: function(key, value) {
    if (!this.items_.hasOwnProperty(key)) {
      this.keys_.push(key);
    }
    this.items_[key] = value;
    this.length = this.keys_.length;
  },
  getItem: function(key) {
    return this.items_[key];
  },
  key: function(index) {
    return this.keys_[index];
  },
  removeItem: function(key) {
    var i = this.keys_.length;
    delete this.items_[key];
    while(i--) {
      if (key === this.keys_[i]) {
        this.keys_.splice(i, 1);
      }
    }
    this.length = this.keys_.length;
  }
};
