# ResponseBuilder
## Build the success and error responses in nodejs application and manage `what` to be sent to client.

Usually in a NodeJS App, we play around with loads of callbacks each with order of parameters `err`, `successResult`, `extraResult`. Each of these callback usually have similar kind of handling. Eg,
* if error found then set status as 400, log error on console or file (for debugging), and send the error response.
* If result not found, then send 404.
* Some of us also like to link a unique request or version of API being used, to be sent to client for future reference.
* Sending `Content-Type` as per `Accept` header found
* many more ..

### ResponseBuilder does all these in very little space of single line of code.

## Install

    npm install rb -g

## How to use

Before without RB :
```javascript
    MongooseModel.find({ _id : some_id }, function(err, docs) {
        if (err) {
            console.error(err);
            res.status(400);
            return res.json({
              error : err
            });
        }

        if (!doc) {
            res.status(404);
            return res.json({
              error : 'Document not found'
            });
        }

        res.json(docs);
    });
```
After with RB :
```javascript
    MongooseModel.get({ _id : some_id }, RB.build(res).all);  // where RB = require('rb')
```

### Builder and Handlers

*Builder as : `RB.build(res)` and handler as `.all`*

#### Builder with only response
	var Builder = RB.build(res [,<options>]);
> Widely used. As sending response does not require any request parameter. Options are used to provide run time parameters, explained in detail below

#### Builder with request as well as response
	RB.build(req,res [,<options>])
> Sometimes you may want to use generate some fields for response that depends up request properties, in those cases you should provide `req,res [,<options>]` as per above format

*and now the handlers*

#### Handler for all
	.all([<error>],[<successResult>],[<extraSuccessData>]);
> Widely used. Handles both error and success case callbacks.
> **This in turn calls `.error` handler or `.success` handler based on the values found of parameters.**

#### Error handler
	.error([<error>],[<onTheFlyStatusCodeORerrorCode>],[<onTheFlyAddingErrorData>])
> Sometime you may want to send error back to client without having a callback. If called without any parameter, default error message will be sent with status 400.

#### Success handler
	.success([<successResult>],[<extraSuccessData>])
> Sometime you may want to send success object without having a callback. If called without any parameter, default success message will be sent with status 200.

#### Build once and handle at multiple places
```javascript
function(req,res){
	var Builder = RB.build(req[,<runTimeOptions>]);
	//...
	someFunctionCallingWithCallBack(Builder.all);
	//...
	return Builder.error('You deserve 401..!',401); //Forcely sending 401 error in certain case
	//..
	someOtherFunctionCallingWithCallBack(Builder.all);
};
```
>In some cases we want to handle response for many places that deal with same request/response. In such cases we can build the builder once and use throught the that route function.

## Options
There are options which configures and handle responses. Every option can either be false or as of corresponding type.

Option | Description | If found unset(false) | Type | Default | ValidOnlyIf
--- | --- | --- | --- | --- | ---
`errorKey` | Name of the key with which main error is associated in response. | Response body will only contain the error after preprocessing. | String | 'error' | Error Handler called
`successKey` | Name of the key with which main success result is associated in response. | Response body will only contain the success object after preprocessing. | String | false | Success Handler called
`extraKey` | The key in success response with which contains extra success data. (came with 3rd parmeter in `.all` or with 2nd parameter in `.success`). | Extra information will not get associated with response object | String | 'total' | Success handler called
`getRequestId` | This will link every response with unique `requestId` for future references. This is the function that return the requestId for a request. You just need to setup this function once globaly with `setOptions` function of `RB`, and will be called throughout the application whenever a `RB` being used. `req` can be found as first parameter if builder was built with `request` | `requestId` will not be linked | Function | Current TimeStamp in MS | (`errorKey` OR `successKey`) AND `addRequestIdWhen`
`addRequestIdWhen` | addRequestId constraints. 0 : never, 1 : only on success, 2 : only on error, 3 : always | `requestId` will not be linked | Integer[0-3] | 0 | `errorKey` or OR `successKey`
`addToError` | Object which will get merged with the error response object | Nothing additional will be merged | Object | false | `errorKey`
`addToSuccess` | Object which will get merged with the success response object | Nothing additional will be merged | Object | false | `successKey`
`defaultSuccessMessage` | In case of falsy value in successResult, this will will be the raw error. | Raw input will be used | String | 'Operation was successfull..!' | `successKey`
`defaultErrorMessage` | In case of falsy value in error, this will will be the raw error. | Raw input will be used | String | 'Ohh..! We experienced an unknown glitch..!' | `errorKey`
`type` | RB first try to find if `req` and its `Accept` header found. If not so, this one determines what  default `Content-Type` header to be sent. | will not set any `Content-Type` | String | 'application/json' | Either `req` not found or its `Accept` is not amongs `xml`, `html` or `plain`
`successStatus` | Success status sode to be sent | 304 | Integer(100-600)  | 200 | Success Handler Called
`errorStatus` | Error status sode to be sent | 304 | Integer(100-600)  | 400 | Error Handler Called
`errorCode` | These are the custom/application error code. So that if end user find this error code in response, one may refer some error code ref page and find reason and how to get rid of that error. | No error code will be set | String without space  | false | `errorKey` and Error handler called
`errorCodeKey` | with which key errorCode to be associated in error object | String  | 'errorCode' | false | `errorCode` is set and error handler called
`noResultStatus` | What status code to be sent if none of error and successResult found | 304 | Integer(100-600)  | 404 | none of error or successResult found
`noResultError` | What Error message to be sent if none of error and successResult found | if `noResultStatus` found and `noResultError` not found, response will be send without body | String  | 'Record not found' | `noResultStatus`
`successCallback` | Builder will build the successObject and then handler will call this function instead of sending to client. Usefull in cases when you want to perform nested database operations before sending final response | Response will be sent to client | Function that get successResult as first parameter  | false | success handler called
`filterProperties` | To remove the fields in response that are critical when known to client eg password, some private key etc. | No fields will be removed | String containing space separated keys | false | success handler called
`preProcessError` | If you want to modify/customize error object before sending to client. You get errorObject as first parameter and you should return modified errrorObject in function | Raw error will be sent | Function that returns modified error | MongoDB Unique entry preprocessor. If you are not using mongoDB, rest assured. In 99% cases it wont affect your error. | error handler called
`preProcessSuccess` | same as `preProcessError` but for success cases. | Raw success data will be sent | Function returning modified success data | false | success handler called
`attachement` | this gives filename of file that needed to be sent as attachement in the response. | Normal response will be sent | String or Function returning name of file as string | false | success handler called
`noResponseBody` | to send no response body, only status required to be sent | normal response will be sent | Boolean | false | always valid
`version` | you may like to send version information of the api client is using. You just need to set version globaly with `setOptions` function of `RB`, and will be saved throughout the application. This field represents the version information. | no version field will be sent | String | false | `errorKey` or `successKey` is set
`versionKey` | the key with which version info to be associated | No version info will be send | String | 'version' | `version` option is set
`logger` | Used to log the error/success responses so as to debug easily in development environment, or customize it so that error/response will be saved in file. (you may integerate [winston](https://github.com/winstonjs/winston) easily for prod) | no loggin will take place | Function | `console.log(requestId, info)` | `logLevel` is set
`logLevel` | in which cases logger should call.  // 0 : never, 1 : only on success, 2 : only on error, 3 : always | logger will not be called | integer[0-3] | 2 | always valid
`headers` | additional header to be sent with response. Common headers like `*-powered-by` to be set once and will be used automatically whenever `RB` is used. | no additional header will be sent | Object, key value pairs of (headerName : headervalue) | false | always valid

### How to set options
#### Globally
	require('rb').setOptions(optionsObject)
    // optionsObject may be something like
    // {version : '1.4.3', noResultStatus : false, successKey : 'result', addToError: { ok : false }, addToSuccess : { ok : true }, //otherValidOptions }
> You can set global options like `version` ,`getRequestId`, and everything that are application specific. This should be called after `RB` is loaded and before the main application starts.

#### At builder
	RB.build(res, optionsObject);
    OR
    RB.build(req, res, optionsObject); //if req is also used further
    // optionsObject may be something like
    // {errorCode : 'OUT_OF_SERVICE', attachement : 'file_name', addToError : { message : 'Credentials are not valid.!' } //otherValidOptions }
> You can set request/response specific options at build time.

### At error handler
	Builder.error('some_error', statusCodeOrErrorCodeOnTheFly, onTheFlyAddToErrorObject)
> Applicable only for error handler. These will be used when you are calling handler yourself without a handler. You may set the properties like statusCode/ErrorCode or to add some properties to error object on the fly.

## Examples

##### examples are on the way .. stay tuned ...

## Roadmap
> Raise a feature request, and that will fill this place


## License

ResponseBuilder is released under the MIT license:

http://www.opensource.org/licenses/MIT
