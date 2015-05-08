module.exports = {
  isObject : function(obj, allowEmpty, allowArrray, allowNull){
    return ((typeof obj === 'object') && (allowNull || obj) &&
        (allowArrray || !Array.isArray(obj)) && (allowEmpty || Object.keys(obj).length));
  },

  isString : function(str, allowEmpty){
    return ((typeof str === 'string') && (allowEmpty || str.length));
  },

  isFunction : function(func){
    return (typeof func === 'function');
  },

  isNumber : function(func){
    return (typeof func === 'number');
  },

  isValidRequest : function(req){
    return (this.isObject(req) && req.httpVersion && req.method && req.url);
  },

  isValidResponse : function(res){
    return (this.isObject(res) && this.isFunction(res.send));
  },

  isFound : function(res, what){
    return this.isFunction(res[what]);
  },

  stringify : function(obj, pretty){
    try {
      if(pretty) return JSON.stringify(obj, null, pretty);
      else return JSON.stringify(obj);
    } catch(e) {
      return obj;
    }
  },

  isValidHTTPStatus : function(code){
    return (code > 99 && code < 599); // assumed that in this range, it will be HTTP status code
  },

  isValidErrorCode : function(code){
    return (code.indexOf(' ') !== -1); // assumed that without space, it will be a valid error code
  },

  getString : function(input, args){
    if(this.isFunction(input)){
      var x = input.apply(input, args);
      if(util.isString(x)) return x;
      else return input;
    } else {
      return input;
    }
  },

  isJSONRequest: function(req){
    return req && ((/application\/json/.test(req.headers['accept'])) || (/application\/json/.test(req.headers['Accept'])));
  },

  isPlainRequest: function(req){
    return req && ((/text\/plain/.test(req.headers['accept'])) || (/text\/plain/.test(req.headers['Accept'])));
  },

  isHTMLRequest: function(req){
    if(!req) return false;
    var ac = req.headers['accept'] || req.headers['Accept'];
    return (ac && ac.indexOf('html') !== -1)
  },

  isXMLRequest: function(req){
    if(!req) return false;
    var ac = req.headers['accept'] || req.headers['Accept'];
    return (/application\/xml/.test(ac));
  },

  cloneObject : function(obj){
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e){
      return false;
    }
  },

  removeProperties : function(obj, ignoreFields, deep){
    if(obj && typeof(obj) === 'object' && typeof(ignoreFields) === 'string') {
      var ignores = ignoreFields.trim().split(' ');
      var iterator = this.iterateInObject(function(obj) {
        if(obj && typeof obj === 'object') {
          if(typeof obj.toJSON === 'function') obj = obj.toJSON();
          if(obj) {
            ignores.forEach(function(i){
              if(Object.prototype.hasOwnProperty.call(obj, i)){
                delete obj[i];
              }
            });
          }
        }
        return obj;
      });
      return iterator(obj, deep);
    } else return obj;
  },

  iterateInObject : function(fun){
    return function(obj, deep){
      if(obj && typeof(obj) === 'object') {
        var scan = function(o, w) {
          if(Array.isArray(o)) {
            for(var index = 0; index < o.length; index++) {
              o[index] = forEachObject(o[index]);
              scan(o[index], w);
            }
          } else if(o && typeof o === 'object') {
            for(var k in o) {
              o = forEachObject(o);
              if(w < (deep-1)) {
                w++;
                scan(o[k], w);
                w--;
              }
            }
          }
        };
        var forEachObject = function(o) {
          if(Array.isArray(o)) {
            for(var index = 0; index < o.length; index++) {
              o[index] = fun(o[index]);
            }
          } else if(o instanceof Object) {
            o = fun(o);
          }
          return o;
        };
        if(typeof deep !== 'number' || deep < 1 || deep > 29) deep = 1; // removing upto max 19(fair enough) deep properties
        obj = forEachObject(obj);
        scan(obj, 1);
      }
      return obj;
    };
  }
};
