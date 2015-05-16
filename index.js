'use strict';

var util = require('./util');

exports.version = '0.0.1';

var options = {
  errorKey : 'error',
  successKey : false,
  extraKey : false,
  getRequestId : function(req){
    return new Date().getTime();
  },
  addRequestIdWhen : 0, // 0 : never, 1 : only on success, 2 : only on error, 3 : always
  addToError : false,
  addToSuccess : false,
  defaultError: 'Ohh..! We experienced an unknown glitch..!',
  defaultSuccess: 'Operation was successfull..!',
  type : 'application/json',
  successStatus : 200,
  noResultStatus : 404,
  noResultError : 'Record not found.',
  errorStatus : 400,
  errorCode : false,
  errorCodeKey : 'errorCode',
  successCallback : false,
  filterProperties : false,
  filterDepth : 5,
  //preProcessError : function(err){ return err; }, ADDED BELOW
  preProcessSuccess : false,
  attachement : false,
  noResponseBody : false,
  version : false,
  versionKey : 'version',
  logLevel: 2, // 0 : never, 1 : only on success, 2 : only on error, 3 : always
  logger : function(requestId, data, extra){
    console.log(requestId, data);
    if(extra !== undefined) console.log(extra);
    if(util.isJSError(data)) console.log(data.stack);
  },
  headers : false
};

options.preProcessError = function(err){
  if(util.isObject(err,{allowJSError:true}) && err.code && err.err){
    //Preprocessing MongoDB unique error message, You may customize for your own requirement
    switch(err.code){
      case 11000:
      case 11001:
        try {
          var fieldName = err.err.substring(err.err.lastIndexOf('.$') + 2, err.err.lastIndexOf('_1'));
          return fieldName.charAt(0).toUpperCase() + fieldName.slice(1) + ' already exists';
        } catch(ex){
          return 'Unique field already exists';
        }
    }
  }
  if(util.isJSError(err)){
    //Preprocessing Mongoose errors, You may customize for your own requirement
    if(util.isObject(err.errors,{allowEmpty : true})){
      var errKeys = Object.keys(err.errors);
      if(errKeys.length === 1){
        var oneErr = err.errors[errKeys[0]];
        if(oneErr.message && oneErr.path){
          return err.message + ' at '+oneErr.path+' : ' + oneErr.message;
        }
      }
    }
    return err.message;
  }
  return err;
};
exports.options = options;

exports.util = util;

function ResponseBuilder(req, res, opts){
  var dk;
  for(dk in options){
    this[dk] = options[dk];
  }
  if(util.isObject(opts)){
    for(dk in opts){
      this[dk] =  opts[dk];
    }
  }
  if(util.isValidRequest(req)) this.req = req;
  if(util.isValidResponse(res)) this.res = res;
  else throw new Error('Response Builder : No response object found.!');
  var self = this;
  this.all = function(err,result,extra){
    if(!result && self.noResultStatus){
      err = self.noResultError;
      self.errorStatus = self.noResultStatus;
    }
    if(err) self.error(err, result, extra);
    else self.success(result, extra);
  };
};

ResponseBuilder.prototype.error = function(err, code, status){
  var roe, inArgs = [code, status], ck, ak, bk, errorStatus, errorCode;
  this.requestId = this.getRequestId(this.req);
  for(var ck in inArgs){
    if(inArgs[ck]){
      switch(typeof inArgs[ck]){
        case 'number':
          if(util.isValidHTTPStatus(inArgs[ck])){
            inArgs[ck] = Math.floor(inArgs[ck]);
            errorStatus = inArgs[ck];
          } else errorCode = inArgs[ck];
          break;
        case 'string' :
          if(util.isValidErrorCode(inArgs[ck])){
            errorCode = inArgs[ck];
          }
      }
    }
  };
  if(util.isFunction(this.logger) && this.logLevel > 1) this.logger(this.requestId, err);
  if(util.isFunction(this.preProcessError)) err = this.preProcessError(err);
  if(err === '_d') err = this.defaultError;
  this.handleFour('errorStatus', errorStatus);
  if(util.isString(this.errorKey)){
    var newError = {};
    if(err) newError[this.errorKey] = util.cloneObject(err);
    err = newError;
    if(this.addRequestIdWhen > 1) err.requestId = this.requestId;
    this.adding(err, [this.addToError]);
    if(util.isString(this.errorCodeKey) && (errorCode || this.errorCode)){
      var erc = util.getString((errorCode || this.errorCode), [err, this.req]);
      if(util.isString(erc)) err[this.errorCodeKey] = erc;
    }
    if(util.isFound(this.res, 'json')) this.res.json(err);
    else this.res.send(util.stringify(err));
  } else this.res.send(err);
};

ResponseBuilder.prototype.success = function(result, extra){
  if(util.isFunction(extra)) return extra(result);
  if(util.isFunction(this.successCallback)) return this.successCallback(result, extra);
  this.requestId = this.getRequestId(this.req);
  if(!result) result = this.defaultSuccess;
  this.handleFour('successStatus');
  if(util.isFunction(this.logger) && this.logLevel%2===1) this.logger(this.requestId, result, extra);
  if(util.isFunction(this.preProcessSuccess)) result = this.preProcessSuccess(result);
  this.filterOut(result);
  if(util.isString(this.successKey)){
    var newResult = {};
    newResult[this.successKey] = util.cloneObject(result);
    result = newResult;
    if(this.addRequestIdWhen%2===1) newResult.requestId = this.requestId;
    this.adding(result, [this.addToSuccess]);
    if(extra !== undefined && extra !== null && util.isString(this.extraKey)){
      result[this.extraKey] = extra;
    }
    if(this.attachement) {
      this.attach(result, true);
    } else {
      if(util.isFound(this.res, 'json')) this.res.json(result);
      else this.res.send(util.stringify(result));
    }
  } else {
    if(this.attachement) this.attach(result);
    else this.res.send(result);
  }
};

ResponseBuilder.prototype.callIfSuccess = function(next){
  var self = this;
  return function(err,success,extra){
    if(err) self.error(err,success,extra);
    else self.success(success,next);
  };
};

ResponseBuilder.prototype.adding = function(src, arr){
  var cloned;
  arr.forEach(function(ae){
    if(util.isObject(ae)){
      cloned = util.cloneObject(ae);
      for(var bk in cloned){
        src[bk] = cloned[bk];
      }
    }
  });
  if(util.isString(this.versionKey) && this.version){
    src[this.versionKey] = this.version;
  }
};

ResponseBuilder.prototype.handleFour = function(or, statusCode){
  this.setType();
  this.status(or, statusCode);
  this.fillHeaders();
  this.checkEnd();
};

ResponseBuilder.prototype.status = function(or, statusCode){
  if(util.isFound(this.res, 'status')) this.res.status(statusCode || this[or] || 304);
  else this.res.statusCode = statusCode || this[or] || 304;
};

ResponseBuilder.prototype.checkEnd = function(){
  if(this.noResponseBody){
    if(util.isFound(this.res, 'end')) return this.res.end();
    if(util.isFound(this.res, 'send')) return this.res.send();
  }
};

ResponseBuilder.prototype.setType = function(){
  if(util.isHTMLRequest(this.req)) this.type = 'text/html';
  else if(util.isXMLRequest(this.req)) this.type = 'application/xml';
  else if(util.isPlainRequest(this.req)) this.type = 'text/plain';
  if(this.type){
    if(util.isFound(this.res, 'type')) this.res.type(this.type);
    else if(util.isFound(this.res, 'setHeader')) this.res.setHeader('Content-Type', this.type);
    else if(util.isObject(this.res.headers)) this.res.headers['Content-Type'] = this.type;
  }
};

ResponseBuilder.prototype.attach = function(data, isJSON){
  var fname = util.getString(this.attachement, [data, this.req]);
  if(!util.isString(fname)) fname = 'attachement';
  if(util.isFound(this.res, 'attachment')){
    this.res.attachment(fname).send(isJSON ? util.stringify(data, ' ') : data);
  } else {
    var attchment = 'attachement; filename="' + fname + '"';
    this.res.setHeader('Content-Disposition', attachment);
    this.res.send(data);
  }
};

ResponseBuilder.prototype.fillHeaders = function(){
  if(util.isObject(this.headers)){
    for(var hk in this.headers){
      this.res.setHeader(hk, this.headers[hk]);
    }
  }
};

ResponseBuilder.prototype.filterOut = function(input){
  if(util.isString(this.filterProperties)) util.removeProperties(input, this.filterProperties, this.filterDepth);
};

exports.build = function(){
  var req, res, opts, args = [].splice.call(arguments,0);;
  switch(args.length){
    case 0 :
      throw new Error('Response Builder : Response object not found.!');
      break;
    case 1 :
      res = args[0];
      break;
    case 2 :
      if(util.isValidResponse(args[1])){
        req = args[0];
        res = args[1];
      } else {
        res = args[0];
        opts = args[1]
      }
      break;
    default :
      req = args[0];
      res = args[1];
      opts = args[2];
  }
  return new ResponseBuilder(req, res, opts);
};

exports.setOptions = function(opts){
  if(util.isObject(opts)){
    for(var ok in opts){
      options[ok] = opts[ok];
    };
  }
};
