'use strict';

var petu = require('petu');

var toExport = {

  isValidHTTPStatus : function(code){
    return (petu.isNumber(code) && code > 99 && code < 599); // assumed that in this range, it will be HTTP status code
  },

  isValidErrorCode : function(code){
    return (petu.isString(code) && code.indexOf(' ') !== -1); // assumed that without space, it will be a valid error code
  },

  isValidResponse : function(res){
    if(!petu.isObject(res)) return false;
    var checks = ['end','write','setHeader'], len = checks.length;
    for(var z=0;z<len;z++){
      if(!petu.isFunction(res[checks[z]])) return false;
    }
    return true;
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

  isJSONRequest: function(req){
    return req && ((/application\/json/.test(req.headers['accept'])) || (/application\/json/.test(req.headers['Accept'])));
  },

  isPlainRequest: function(req){
    return req && ((/text\/plain/.test(req.headers['accept'])) || (/text\/plain/.test(req.headers['Accept'])));
  }

};

var vendor = ['isString','isNumber','isObject','copy','isFunction','getString','stringify','isFound','walkInto','removeProperties'];
vendor.forEach(function(path){
  toExport[path] = petu[path].bind(petu.petu);
});

module.exports = toExport;
