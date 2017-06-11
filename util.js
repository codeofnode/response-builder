'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.isObject = function (ob) {
  return (typeof ob === 'undefined' ? 'undefined' : _typeof(ob)) === 'object' && ob !== null && !Array.isArray(ob);
};

var isString = function isString(ob) {
  return typeof ob === 'string' && ob.length > 0;
};
exports.isString = isString;

exports.isNumber = function (ob) {
  return typeof ob === 'number' && ob !== isNaN && ob > 0;
};

var notExists = function notExists(ob) {
  return typeof ob === 'undefined' || ob === null;
};
exports.notExists = notExists;

exports.exists = function (ob) {
  return !notExists(ob);
};

var stringify = function stringify(input, pretty) {
  if (typeof input === 'string') return input;
  if ((typeof input === 'undefined' ? 'undefined' : _typeof(input)) === 'object') {
    try {
      return pretty ? JSON.stringify(input, undefined, isString(pretty) ? pretty : '  ') : JSON.stringify(input);
    } catch (err) {
      return String(input);
    }
  }
  return String(input);
};
exports.stringify = stringify;

exports.getString = function getString(input) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return typeof input === 'function' ? input(args) : stringify(input);
};

exports.isNested = function (obj, depth) {
  return depth < 99 && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj !== null && obj.$W_END !== true;
};

var walkInto = function walkInto(fun, rt, obj, key) {
  var depth = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
  var isLast = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : true;

  fun(obj, key, rt, depth, isLast);
  if (exports.isNested(obj, depth)) {
    var ob = rt ? rt[key] : obj;
    var kys = Object.keys(ob);
    var lastln = kys.length;
    var deep = depth + 1;
    for (var z = 0; z <= lastln; z += 1) {
      walkInto(fun, ob, ob[kys[z]], kys[z], deep, z === lastln);
    }
  }
};
exports.walkInto = walkInto;

exports.valueInWalk = function (prps, val, key, root) {
  var rt = root;
  if (prps.indexOf(key) !== -1) {
    delete rt[key];
  }
};

exports.removeProperties = function (obj, props) {
  var vInWalk = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : exports.valueInWalk;

  if (isString(props)) {
    walkInto(vInWalk.bind(undefined, props.split(' ')), null, obj);
  }
};