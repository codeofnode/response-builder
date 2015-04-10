'use strict';

var util = require('./util');

exports.version = '0.0.1';

var options = {
  errorKey : 'error',
  successKey : false,
  extraKey : 'total',
  getRequestId : function(req){
    return new Date().getTime();
  },
  addRequestIdWhen : 0, // 0 : never, 1 : only on success, 2 : only on error, 3 : always
  addToError : false,
  addToSuccess : false,
  defaultErrorMessage: 'Ohh..! We experienced an unknown glitch..!',
  defaultSuccessMessage: 'Operation was successfull..!',
  type : 'application/json',
  successStatus : 200,
  noResultStatus : 404,
  noResultError : 'Record not found.',
  errorStatus : 400,
  errorCode : false,
  errorCodeKey : 'errorCode',
  successCallback : false,
  filterProperties : false,
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
  },
  headers : false
};

options.preProcessError = function(err){
  if(util.isObject(err) && err.code && err.err){
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
        break;
      default: return err;
    }
  }
  return err;
};
exports.options = options;

exports.util = util;

function ResponseBuilder(req, res, opts){
  var toReturn = {}, dk, apis = ['all','error', 'success'];
  for(dk in options){
    this[dk] = toReturn[dk] = options[dk];
  }
  if(util.isObject(opts)){
    for(dk in opts){
      this[dk] = toReturn[dk] = opts[dk];
    }
  }
  if(util.isValidRequest(req)) this.req = req;
  if(util.isValidResponse(res)) this.res = res;
  else throw new Error('Response Builder : No response object found.!');
  for(dk in apis){
    toReturn[apis[dk]] = ResponseBuilder.prototype[apis[dk]].bind(this);
  }
  return toReturn;
};

ResponseBuilder.prototype.all = function(err,result,extra){
  this.requestId = this.getRequestId(this.req);
  if(!result && this.noResultStatus){
    err = this.noResultError;
    this.errorStatus = this.noResultStatus;
  }
  if(err) this.error(err, result, extra);
  else this.success(result, extra);
};

ResponseBuilder.prototype.error = function(err, code, status){
  var roe, inArgs = [code, status], ck, ak, bk, errorStatus, errorCode, addToError = {};
  for(var ck in inArgs){
    if(inArgs[ck]){
      switch(typeof inArgs[ck]){
        case 'object':
          if(util.isObject(inArgs[ck])){
            for(ak in inArgs[ck]){
              addToError[ak] = inArgs[ck][ak];
            }
          }
          break;
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
  if(util.isFunction(this.preProcessError)) err = util.getString(this.preProcessError, [err]);
  if(err === '_d') err = this.defaultErrorMessage;
  this.handleFour('errorStatus', errorStatus);
  if(util.isString(this.errorKey)){
    var newError = {};
    if(err) newError[this.errorKey] = util.cloneObject(err);
    err = newError;
    if(this.addRequestIdWhen > 1) err.requestId = this.requestId;
    this.adding(err, [this.addToError, addToError]);
    if(util.isString(this.errorCodeKey) && (errorCode || this.errorCode)){
      var erc = util.getString((errorCode || this.errorCode), [err, this.req]);
      if(util.isString(erc)) err[this.errorCodeKey] = erc;
    }
    if(util.isFound(this.res, 'json')) this.res.json(err);
    else this.res.send(util.stringify(err));
  } else this.res.send(err);
};

ResponseBuilder.prototype.adding = function(obj, arr){
  arr.forEach(function(ae){
    if(util.isObject(ae)){
      for(var bk in ae){
        obj[bk] = ae[bk];
      }
    }
  });
  if(util.isString(this.versionKey) && this.version){
    obj[this.versionKey] = this.version;
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

ResponseBuilder.prototype.success = function(result, extra){
  if(util.isFunction(this.successCallback)) return this.successCallback(result, extra);
  this.filterOut(result);
  if(util.isFunction(this.logger) && this.logLevel%2===1) this.logger(this.requestId, result, extra);
  if(util.isFunction(this.preProcessSuccess)) result = this.preProcessSuccess(result);
  if(!result) result = this.defaultSuccessMessage;
  this.handleFour('successStatus');
  if(util.isString(this.successKey)){
    var newResult = {};
    newResult[this.successKey] = util.cloneObject(result);
    result = newResult;
    if(this.addRequestIdWhen%2===1) newResult.requestId = this.requestId;
    this.adding(result, [this.addToSuccess]);
    if(extra !== undefined && extra !== null && util.isString(this.extraKey)) result[this.extraKey] = extra;
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

ResponseBuilder.prototype.extend = function(key,object){
  if(util.isObject(key)){
    object = key;
    key = this;
  } else if(util.isString(key) && util.isObject(object)){
    key = this[key];
  } else throw new Error('Response Builder : extend options not found.!');
  if(util.isObject(key)){
    for(var k in object){
      key[k] = object[k];
    }
  } else throw new Error('Response Builder : Invalid propety selected to extend.!');
};

ResponseBuilder.prototype.fillHeaders = function(){
  if(util.isObject(this.headers)){
    for(var hk in this.headers){
      this.res.setHeader(hk, this.headers[hk]);
    }
  }
};

ResponseBuilder.prototype.filterOut = function(input){
  if(util.isString(this.filterProperties)) util.removeProperties(input, this.filterProperties);
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
