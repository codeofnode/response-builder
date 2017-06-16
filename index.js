'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var http = require('http');

var util = require('./util');

var options = {
  errorKey: 'error',
  successKey: false,
  extraKey: false,
  addRequestIdWhen: 0, // 0 : never, 1 : only on success, 2 : only on error, 3 : always
  addToError: false,
  addToSuccess: false,
  defaultError: 'SOME_UNKNOWN_ERROR',
  defaultErrorKey: 'rb_d',
  defaultSuccess: 'SUCCESS',
  responseType: 'application/json',
  successStatus: 200,
  noResultStatus: 404,
  responseEncoding: 'utf8',
  noResultError: 'RECORD_NOT_FOUND',
  errorStatus: 400,
  errorCode: false,
  errorCodeKey: 'errorCode',
  successCallback: false,
  filterProperties: false,
  preProcessError: false,
  preProcessSuccess: false,
  attachFile: false,
  noResponseBody: false,
  appVersion: false,
  versionKey: 'version',
  responseHeaders: false,
  logLevel: 2, // 0 : never, 1 : only on success, 2 : only on error, 3 : always
  getRequestId: Date.now,
  logger: function logger(requestId, data, extra) {
    console.log(requestId, data); // eslint-disable-line no-console
    if (util.exists(extra)) console.log(extra); // eslint-disable-line no-console
    if (data instanceof Error) console.log(data.stack); // eslint-disable-line no-console
  }
};

var AllowedOptions = Object.keys(options);

var _callIfSuccess = function callIfSuccess(next, err, success, extra) {
  if (err) this.error(err, success, extra);else this.success(success, next);
};

var RbError = function (_Error) {
  _inherits(RbError, _Error);

  function RbError(message) {
    _classCallCheck(this, RbError);

    var _this = _possibleConstructorReturn(this, (RbError.__proto__ || Object.getPrototypeOf(RbError)).call(this));

    _this.message = message;
    _this.stack = new Error().stack;
    _this.name = _this.constructor.name;
    return _this;
  }

  return RbError;
}(Error);

var ResponseBuilder = function () {
  function ResponseBuilder(req, res, opts) {
    var _this2 = this;

    _classCallCheck(this, ResponseBuilder);

    AllowedOptions.forEach(function (key) {
      return _this2[key] = key in opts ? opts[key] : options[key];
    });
    if (!(res instanceof http.ServerResponse)) {
      throw new RbError('Second parameter must be an instance of `http.ServerResponse`');
    }
    this.req = req;
    this.res = res;
    this.hasBothReqRes = req instanceof http.IncomingMessage;
  }

  // assumed that in this range, it will be HTTP status code


  _createClass(ResponseBuilder, [{
    key: 'setType',
    value: function setType() {
      if (this.responseType) {
        this.res.setHeader('Content-Type', util.getString(this.responseType, this.req));
      }
    }
  }, {
    key: 'status',
    value: function status(statusType, statusCode) {
      this.res.statusCode = statusCode || this[statusType] || 304;
    }
  }, {
    key: 'fillHeaders',
    value: function fillHeaders() {
      var _this3 = this;

      if (util.isObject(this.responseHeaders)) {
        Object.keys(this.responseHeaders).forEach(function (key) {
          _this3.res.setHeader(key, _this3.responseHeaders[key]);
        });
      }
    }
  }, {
    key: 'checkEnd',
    value: function checkEnd() {
      return this.noResponseBody ? this.res.end() : false;
    }
  }, {
    key: 'handleFour',
    value: function handleFour(statusType) {
      this.setType();
      this.status(statusType);
      this.fillHeaders();
      return this.checkEnd();
    }
  }, {
    key: 'fillRequestId',
    value: function fillRequestId() {
      if (typeof this.getRequestId === 'function') {
        this.requestId = this.getRequestId(this.req);
      }
    }
  }, {
    key: 'addVersion',
    value: function addVersion(obj) {
      var ob = obj;
      if (util.isString(this.versionKey) && this.appVersion) {
        ob[this.versionKey] = this.appVersion;
      }
    }
  }, {
    key: 'filterOut',
    value: function filterOut(obj) {
      util.removeProperties(obj, this.filterProperties);
    }
  }, {
    key: 'attach',
    value: function attach(data) {
      var fname = util.getString(this.attachFile, data, this.req);
      if (!util.isString(fname)) fname = 'attachement';
      this.res.setHeader('Content-Disposition', 'attachement; filename="' + fname + '"');
      return util.stringify(data, true);
    }
  }, {
    key: 'all',
    value: function all(err, result, extra) {
      if (err) {
        this.error(err, result, extra);
      } else if (util.notExists(result) && this.noResultStatus) {
        this.error(this.noResultError, this.noResultStatus, extra);
      } else this.success(result, extra);
    }
  }, {
    key: 'error',
    value: function error(err, code, status) {
      var er = err;
      this.fillRequestId();
      if (ResponseBuilder.isValidHTTPStatus(code)) {
        this.errorStatus = code;
      } else if (ResponseBuilder.isValidErrorCode(code)) {
        this.errorCode = code;
        if (ResponseBuilder.isValidHTTPStatus(status)) {
          this.errorStatus = status;
        }
      }
      if (typeof this.logger === 'function' && this.logLevel > 1) this.logger(this.requestId, er);
      if (typeof this.preProcessError === 'function') er = this.preProcessError(er);
      if (er === this.defaultErrorKey) er = this.defaultError;else if (er instanceof Error) er = er.message;
      if (!this.handleFour('errorStatus')) {
        if (util.isString(this.errorKey)) {
          var newError = {};
          newError[this.errorKey] = er;
          if (this.addRequestIdWhen > 1 && util.exists(this.requestId)) {
            newError.requestId = this.requestId;
          }
          this.addVersion(newError);
          Object.assign(newError, this.addToError);
          if (util.isString(this.errorCodeKey) && this.errorCode) {
            newError[this.errorCodeKey] = util.getString(this.errorCode, er, this.req);
          }
          er = newError;
        }
        this.res.end(util.stringify(er), util.getString(this.responseEncoding, this.req));
      }
    }
  }, {
    key: 'success',
    value: function success(result, extra) {
      var res = result;
      if (typeof extra === 'function') {
        extra(res);
      } else if (typeof this.successCallback === 'function') {
        this.successCallback(res, extra);
      } else {
        this.fillRequestId();
        if (!res) res = this.defaultSuccess;
        this.handleFour('successStatus');
        if (typeof this.logger === 'function' && this.logLevel % 2 === 1) {
          this.logger(this.requestId, res, extra);
        }
        if (typeof this.preProcessSuccess === 'function') res = this.preProcessSuccess(res);
        if (util.isString(this.successKey)) {
          var nres = {};
          nres[this.successKey] = res;
          if (this.addRequestIdWhen % 2 === 1 && util.exists(this.requestId)) {
            nres.requestId = this.requestId;
          }
          this.addVersion(nres);
          if (util.exists(extra) && util.isString(this.extraKey)) {
            nres[this.extraKey] = extra;
          }
          Object.assign(nres, this.addToSuccess);
          res = nres;
        }
        this.filterOut(res);
        if (this.attachFile) res = this.attach(res);
        this.res.end(util.stringify(res), util.getString(this.responseEncoding, this.req));
      }
    }
  }, {
    key: 'callIfSuccess',
    value: function callIfSuccess(next) {
      return _callIfSuccess.bind(this, next);
    }
  }], [{
    key: 'isValidHTTPStatus',
    value: function isValidHTTPStatus(code) {
      return typeof code === 'number' && code > 99 && code < 600;
    }

    // assumed that without space, it will be a valid error code

  }, {
    key: 'isValidErrorCode',
    value: function isValidErrorCode(ob) {
      return util.isString(ob) && ob.indexOf(' ') === -1;
    }
  }]);

  return ResponseBuilder;
}();

exports.version = require('./package.json').version; // eslint-disable-line import/no-unresolved

exports.ResponseBuilder = ResponseBuilder;
exports.util = util;

exports.build = function (req, res, opts) {
  var rq = req;
  var rs = res;
  var os = opts;
  if (rq instanceof http.ServerResponse) {
    os = res;
    rs = req;
    rq = null;
  }
  return new ResponseBuilder(rq, rs, os);
};

exports.setOptions = function (opts) {
  return AllowedOptions.forEach(function (key) {
    if (key in opts) {
      options[key] = opts[key];
    }
  });
};