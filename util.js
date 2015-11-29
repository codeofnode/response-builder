'use strict';

module.exports = {
  isValidNumber:function(input, addZero, allowDec){
    var prev = String(input);
    return Boolean(typeof input === 'number' && !(isNaN(input)) && (addZero || input > 0)
        && (allowDec || (prev === String(parseInt(prev,10)))));
  },

  isValidString:function(input,allowEmpty){
    return Boolean(typeof input === 'string' && (allowEmpty || input));
  },

  stringify : function(input,pretty,defMsg){
    if(this.isValidString(input,true)){
      return input;
    } else if(this.isValidObject(input,true,true)){
      try {
        return pretty ? JSON.stringify(input, undefined, 2) : JSON.stringify(input);
      } catch(e) {
        return this.isValidString(defMsg) ? defMsg : 'CIRCULAR_JSON_FOUND';
      }
    } else return String(input);
  },

  isObjectEmpty : function(input){
    return Boolean(typeof input === 'object' && input && !(Object.keys(input).length));
  },

  walkInto : function(fun, root, obj, key, count, maxCount){
    if(!this.isValidNumber(count)) {
      if(this.isValidObject(fun,true,true) && typeof root === 'function'){
        obj = fun; fun = root; root = null;
        count = 0;
        if(this.isValidNumber(obj)) maxCount = obj;
      } else return;
    }
    if(typeof fun !== 'function') return;
    if(!this.isValidNumber(maxCount)) maxCount = 999;
    if(this.isValidObject(obj,true,true) && count < maxCount){
      fun(obj, key, root, count);
      count++;
      var keys = Object.keys(obj);
      for(var z=0,len=keys.length;z<len;z++){
        this.walkInto.bind(this, fun, obj)(obj[keys[z]], keys[z], count, maxCount);
      }
    }
  },

  removeProperties : function(obj, ignoreFields,deep){
    var ignores = ignoreFields.trim().split(' ');
    var isObject = this.isValidObject.bind(this);
    this.walkInto(obj, function(obj,key,root){
      if(isObject(root) && ignores.indexOf(key) !== -1){
        delete root[key];
      }
    },deep);
  },

  isFound : function(a){
    return (a !== undefined && a !== null);
  },

  isValidObject : function(obj, allowEmpty, allowArray, allowNull){
    return Boolean((typeof obj === 'object') && (allowNull || obj) &&
      (allowArray || !Array.isArray(obj)) && (allowEmpty || Object.keys(obj).length));
  },

  isValidHTTPStatus : function(code){
    return (this.isValidNumber(code) && code > 99 && code < 599); // assumed that in this range, it will be HTTP status code
  },

  isValidErrorCode : function(code){
    return (this.isValidString(code) && code.indexOf(' ') !== -1); // assumed that without space, it will be a valid error code
  },

  isFunction : function(inp){
    return typeof inp === 'function';
  },

  getString : function(input, args){
    if(this.isFunction(input)){
      return this.stringify(input.apply(input, args));
    } else {
      return this.stringify(input);
    }
  },

  isJSONRequest: function(req){
    return req && ((/application\/json/.test(req.headers['accept'])) || (/application\/json/.test(req.headers['Accept'])));
  },

  isPlainRequest: function(req){
    return req && ((/text\/plain/.test(req.headers['accept'])) || (/text\/plain/.test(req.headers['Accept'])));
  },

  copy : function(source,obj,over,func){
    if(this.isValidObject(obj) && this.isValidObject(source,true)){
      for(var key in obj){
        if(obj.hasOwnProperty(key) && (over || !source.hasOwnProperty(key))
            && (typeof func !== 'function' || func(obj[key]))){
          source[key] = obj[key];
        }
      }
    }
  },

  isValidResponse : function(res){
    if(!this.isValidObject(res)) return false;
    var checks = ['end','write','setHeader'], len = checks.length;
    for(var z=0;z<len;z++){
      if(!this.isFunction(res[checks[z]])) return false;
    }
    return false;
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
  }
};
