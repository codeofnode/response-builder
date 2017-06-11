# ResponseBuilder
## Build the success and error responses in nodejs application and manage `what` to be sent to client.

## Features
* Automatically logging all the errors, if found, whether on terminal/file
* Setting up status code for error and success automatically
* Automatically detect 404 cases and sent 404 response in those cases.
* Attaching a unique requestId each time a response a sent. With which client can report some unknown error to the API service provider, referencing that requestId.
* Sending your custom errorCode of your app, which can help client to see and identify why an error encountered and what is the remedy.
* Adding extra fields like message, status or any other field while sending response
* If provided, automatically sends the API version information with each response sent to client. That can have many advantages like handling client side code based on the API version and many others if we think.
* Every feature can be set/unset as options, that is customizable globally(throught the app), run-time(within a route function/block) or on-fly(at time of calling handler)
* Reduced, clean and manageable code for your nodejs server.

## Install

    npm install rb

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
    MongooseModel.find({ _id : some_id }, RB.build(res).all);  // where RB = require('rb')
```

### Builder and Handlers

*Builder as : `RB.build(res)` and handler as `.all`*

#### Builder with only response
	var Builder = RB.build(res [,<options>]);
> Widely used. As sending response does not require any request parameter. Options are used to provide run time parameters, explained in detail below.

#### Builder with request as well as response
	RB.build(req,res [,<options>])
> Sometimes you may want to use generate some fields for response that depends up request properties, in those cases you should provide `req,res [,<options>]` as per above format

*and now the handlers*

#### Handler for all
	.all([<error>],[<successResult>],[<extraSuccessData>]);
> Widely used. Handles both error and success case callbacks.
> **This in turn calls `.error` handler or `.success` handler based on the values found of parameters.**

#### Error handler
	.error([<error>],[<onTheFlyStatusCode>],[<onTheFlyErrorCode>])
> Sometime you may want to send error back to client without having a callback. If called without any parameter, default error message will be sent with status 400.

#### Success handler
	.success([<successResult>],[<extraSuccessData>])
> Sometime you may want to send success object without having a callback. If called without any parameter, default success message will be sent with status 200.
> If 2nd parameter is a function, then it will be used as returning success callback instead of sending response to client.

#### Callback handler
	.callIfSuccess(<callBackAsParameter>)
> In many cases, you only want to handle only success cases to make further callbacks before sending response to client. Calling this with a function (callback) as parameter that is called with the success result after processing. If in case an error found, then this callback will not be called, and error will directly sent to client

#### Build once and handle at multiple places
```javascript
function(req,res){
	var Builder = RB.build(req,res[,<runTimeOptions>]);
	//...
	someFunctionCallingWithCallBack(Builder.all);
	//...
	return Builder.error('You deserve 401..!',401); //Forcely sending 401 error in certain case
	//..
	someOtherFunctionCallingWithCallBack(Builder.all);
};
```
>In some cases we want to handle response for many places that deal with same request/response. In such cases we can build the builder once and use throught the that route function.

## Best Practice
In a express like application, we can setup a middleware where we can build the `responseBuilder` and associate it with res. eg.
```javascript
  // example of setup middleware, (considering express.io being used)
  app.use(function(req,res,next){
    // you can setup any logic to build the builder based on parameter/url/method you find in request.
    // for example, here i am setting extraKey, valid only for GET request otherwise false, that will auto put total no of records fetched in case of GET requests.
    // You can build the builder the way you want, passing other valid options from table below.
    res.RB = RB.build(req,res,{ extraKey : (req.method === 'GET' ? 'total' : false) });
    // or if you want very simple, you can even do like this `res.RB = RB.build(res);` see builder section above.
  });

```
> Now we have response builder as `res.RB`. Now use `res.RB.<anyOfAboveHandlers>` wherever you want in your controllers. See handlers above

## Options
There are options which configures and handle responses. Every option can either be false or as of corresponding type.

Option | Description | If found unset(false) | Type | Default | ValidOnlyIf
--- | --- | --- | --- | --- | ---
`errorKey` | Name of the key with which main error is associated in response. | Response body will only contain the error after preprocessing. | String | 'error' | Error Handler called
`successKey` | Name of the key with which main success result is associated in response. | Response body will only contain the success object after preprocessing. | String | false | Success Handler called
`extraKey` | The key in success response with which contains extra success data. (came with 3rd parmeter in `.all` or with 2nd parameter in `.success`). | Extra information will not get associated with response object | String | false | Success handler called
`getRequestId` | This will link every response with unique `requestId` for future references. This is the function that return the requestId for a request. You just need to setup this function once globaly with `setOptions` function of `RB`, and will be called throughout the application whenever a `RB` being used. `req` can be found as first parameter if builder having property `req` | `requestId` will not be linked | Function | Current TimeStamp in MS | (`errorKey` OR `successKey`) AND `addRequestIdWhen`
`addRequestIdWhen` | addRequestId constraints. 0 : never, 1 : only on success, 2 : only on error, 3 : always | `requestId` will not be linked | Integer[0-3] | 0 | `errorKey` or OR `successKey`
`addToError` | Object which will get merged with the error response object | Nothing additional will be merged | Object | false | `errorKey`
`addToSuccess` | Object which will get merged with the success response object | Nothing additional will be merged | Object | false | `successKey`
`defaultSuccess` | In case of falsy value in successResult, this will will be the raw error. | Raw input will be used | String | 'SUCCESS' | `successKey`
`defaultError` | In case of falsy value in error, this will will be the raw error. | Raw input will be used | String | 'SOME_UNKNOWN_ERROR' | `errorKey`
`responseType` | RB first try to find if `req` and its `Accept` header found. If not so, this one determines what  default `Content-Type` header to be sent. | will not set any `Content-Type` | String | 'application/json' | Either `req` not found or its `Accept` is not amongs `xml`, `html` or `plain`
`successStatus` | Success status sode to be sent | 304 | Integer(100-600)  | 200 | Success Handler Called
`errorStatus` | Error status sode to be sent | 304 | Integer(100-600)  | 400 | Error Handler Called
`errorCode` | These are the custom/application error code. So that if end user find this error code in response, one may refer some error code ref page and find reason and how to get rid of that error. | No error code will be set | String without space  | false | `errorKey` and Error handler called
`errorCodeKey` | with which key errorCode to be associated in error object | String  | 'errorCode' | false | `errorCode` is set and error handler called
`noResultStatus` | What status code to be sent if none of error and successResult found | 304 | Integer(100-600)  | 404 | none of error or successResult found
`noResultError` | What Error message to be sent if none of error and successResult found | if `noResultStatus` found and `noResultError` not found, response will be send without body | String  | 'RECORD_NOT_FOUND' | `noResultStatus`
`successCallback` | Builder will build the successObject and then handler will call this function instead of sending to client. Usefull in cases when you want to perform nested database operations before sending final response | Response will be sent to client | Function that get successResult as first parameter  | false | success handler called
`filterProperties` | To remove the fields in response that are critical when known to client eg password, some private key etc. | No fields will be removed | String containing space separated keys | false | success handler called
`preProcessError` | If you want to modify/customize error object before sending to client. You get errorObject as first parameter and you should return modified errrorObject in function | Raw error will be sent | Function that returns modified error | MongoDB Unique entry preprocessor. If you are not using mongoDB, rest assured. In 99% cases it wont affect your error. | error handler called
`preProcessSuccess` | same as `preProcessError` but for success cases. | Raw success data will be sent | Function returning modified success data | false | success handler called
`attachFile` | this gives filename of file that needed to be sent as attachement in the response. | Normal response will be sent | String or Function returning name of file as string | false | success handler called
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
	Builder.error('some_error', statusCodeOnTheFly, ErrorCodeOnTheFly)
> Applicable only for error handler. These will be used when you are calling handler yourself without a handler. You may set the properties like statusCode or ErrorCode.

## Roadmap
> Raise a feature request by logging an [issue](https://github.com/nodeofcode/response-builder/issues), and that will fill this place

## Any hurdles?
> Found anything difficult to understand? or some bug or some improvement?. Create an issue [issue](https://github.com/nodeofcode/response-builder/issues) for the same.

## License

ResponseBuilder is released under the MIT license:

http://www.opensource.org/licenses/MIT
