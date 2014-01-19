// Object.create Polyfill
// ----------------------

// Allowing use of much of the functionality of Object.create in implementations
// that do not natively support it.
// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
if (!Object.create) {
  Object.create = (function(){
    function F(){}

    return function(o){
      if (arguments.length !== 1) {
        throw new Error('Object.create implementation only accepts one parameter.');
      }
      F.prototype = o;
      return new F();
    };
  })();
}
