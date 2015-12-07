'use strict';

var util = require('./util');

exports.version = require('./package.json').version;

var options = {
  errorKey : 'error',
  successKey : false,
  extraKey : false,
  addRequestIdWhen : 0, // 0 : never, 1 : only on success, 2 : only on error, 3 : always
  addToError : false,
  addToSuccess : false,
  defaultError: 'Ohh..! We experienced an unknown glitch..!',
  defaultErrorKey : 'rb_d',
  defaultSuccess: 'Operation was successful..!',
  responseType : 'application/json',
  successStatus : 200,
  noResultStatus : 404,
  responseEncoding : 'utf8',
  noResultError : 'Record not found.',
  errorStatus : 400,
  errorCode : false,
  errorCodeKey : 'errorCode',
  successCallback : false,
  filterProperties : false,
  filterDepth : false,
  preProcessError : false,
  preProcessSuccess : false,
  attachFile : false,
  noResponseBody : false,
  appVersion : false,
  versionKey : 'version',
  logLevel: 2, // 0 : never, 1 : only on success, 2 : only on error, 3 : always
  responseHeaders : false,
  getRequestId : function(req){
    return new Date().getTime();
  },
  logger : function(requestId, data, extra){
    console.log(requestId, data);
    if(extra !== undefined) console.log(extra);
    if(data instanceof Error) console.log(data.stack);
  }
};

var allowedOptions = Object.keys(options);
var isValidOption = function(opt, key){
  return util.isString(key) && allowedOptions.indexOf(key) !== -1;
};

exports.util = util;

function ResponseBuilder(req,res,opts){
  util.copy(this,options,null,isValidOption);
  util.copy(this,opts,true);
  this.req = req;
  if(util.isValidResponse(res)) this.res = res;
  else throw new Error('RB : Missing instance of `http.serverResponse`');
};

ResponseBuilder.prototype.all = function(err, result, extra){
  if(!result && this.noResultStatus){
    err = this.noResultError;
    this.errorStatus = this.noResultStatus;
  }
  if(err) this.error(err, result, extra);
  else this.success(result, extra);
};

ResponseBuilder.prototype.error = function(err, code, status){
  this.fillRequestId();
  if(util.isValidHTTPStatus(code)){
    this.statusCode = code;
  } else if(util.isValidErrorCode(code)){
    this.errorCode = code;
    if(util.isValidHTTPStatus(status)){
      this.statusCode = status;
    }
  }
  if(util.isFunction(this.logger) && this.logLevel > 1) this.logger(this.requestId, err);
  if(util.isFunction(this.preProcessError)) err = this.preProcessError(err);
  if(err === this.defaultErrorKey) err = this.defaultError;
  else if(err instanceof Error) err = err.message;
  this.handleFour('errorStatus');
  var newError = false;
  if(util.isString(this.errorKey)){
    newError = {};
    newError[this.errorKey] = err;
    if(this.addRequestIdWhen > 1 && util.isFound(this.requestId)) newError.requestId = this.requestId;
    util.copy(newError, this.addToError, false);
    this.addVersion(newError);
    if(util.isString(this.errorCodeKey) && this.errorCode){
      newError[this.errorCodeKey] = util.getString(this.errorCode, [err, this.req]);
    }
  }
  this.res.end(util.stringify(newError || err),util.getString(this.responseEncoding, [this.req]));
};

ResponseBuilder.prototype.addVersion = function(obj){
  if(util.isString(this.versionKey) && this.appVersion){
    obj[this.versionKey] = this.appVersion;
  }
};

ResponseBuilder.prototype.fillRequestId = function(){
  if(util.isFunction(this.getRequestId)){
    this.requestId = this.getRequestId(this.req);
  }
};

ResponseBuilder.prototype.success = function(result, extra){
  if(util.isFunction(extra)) return extra(result);
  if(util.isFunction(this.successCallback)) return this.successCallback(result, extra);
  this.fillRequestId();
  if(!result) result = this.defaultSuccess;
  this.handleFour('successStatus');
  if(util.isFunction(this.logger) && this.logLevel%2===1) this.logger(this.requestId, result, extra);
  if(util.isFunction(this.preProcessSuccess)) result = this.preProcessSuccess(result);
  var newResult = false;
  if(util.isString(this.successKey)){
    newResult = {};
    newResult[this.successKey] = result;
    if(this.addRequestIdWhen%2===1 && util.isFound(this.requestId)) newResult.requestId = this.requestId;
    util.copy(newResult, this.addToSuccess, false);
    this.addVersion(newResult);
    if(util.isFound(extra) && util.isString(this.extraKey)){
      result[this.extraKey] = extra;
    }
  }
  var last = newResult || result;
  this.filterOut(last);
  if(this.attachFile) this.attach(last);
  else this.res.end(util.stringify(last),util.getString(this.responseEncoding, [this.req]));
};

var callIfSuccess = function(next,err,success,extra){
  if(err) this.error(err,success,extra);
  else this.success(success,next);
};

ResponseBuilder.prototype.callIfSuccess = function(next){
  return callIfSuccess.bind(this,next);
};

ResponseBuilder.prototype.handleFour = function(statusType){
  this.setType();
  this.status(statusType);
  this.fillHeaders();
  this.checkEnd();
};

ResponseBuilder.prototype.status = function(statusType,statusCode){
  this.res.statusCode = statusCode || this[statusType] || 304;
};

ResponseBuilder.prototype.checkEnd = function(){
  if(this.noResponseBody){
    this.res.end();
  }
};

ResponseBuilder.prototype.setType = function(){
  if(util.isHTMLRequest(this.req)) this.responseType = 'text/html';
  else if(util.isXMLRequest(this.req)) this.responseType = 'application/xml';
  else if(util.isPlainRequest(this.req)) this.responseType = 'text/plain';
  if(this.responseType){
    if(util.isFunction(this.res.setHeader)) this.res.setHeader('Content-Type', util.getString(this.responseType, [this.req]));
  }
};

ResponseBuilder.prototype.attach = function(data){
  var fname = util.getString(this.attachFile, [data, this.req]);
  if(!util.isString(fname)) fname = 'attachement';
  var attchment = 'attachement; filename="' + fname + '"';
  this.res.setHeader('Content-Disposition', attachment);
  this.res.end(util.stringify(data,true));
};

ResponseBuilder.prototype.fillHeaders = function(){
  var setHeader = this.res.setHeader.bind(this.res);
  util.walkInto(this.responseHeaders,function(val,key){
    setHeader(hk, util.stringify(val));
  },1);
};

ResponseBuilder.prototype.filterOut = function(input){
  if(util.isString(this.filterProperties)) util.removeProperties(input, this.filterProperties, this.filterDepth);
};

exports.build = function(req,res,opts){
  var _opts = {};
  if(util.isValidResponse(req)){
     util.copy(_opts,res,null,isValidOption);
     res = req; req = null;
  }
  return new ResponseBuilder(req, res, _opts);
};

exports.setOptions = function(opts){
  util.copy(options,opts,true,isValidOption);
};
