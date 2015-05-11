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
    MongooseModel.find({ _id : some_id }, RB.build(res).all);  // where RB = require('rb')
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
> If 2nd parameter is a function, then it will be used as returning success callback instead of sending response to client.

#### Callback handler
	.callIfSuccess(<callBackAsParameter>)
> In many cases, you only want to handle only success cases to make further callbacks before sending response to client. Calling this with a function (callback) as parameter that is called with the success result after processing. If in case an error found, then this callback will not be called, and error will directly sent to client

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
`defaultSuccess` | In case of falsy value in successResult, this will will be the raw error. | Raw input will be used | String | 'Operation was successfull..!' | `successKey`
`defaultError` | In case of falsy value in error, this will will be the raw error. | Raw input will be used | String | 'Ohh..! We experienced an unknown glitch..!' | `errorKey`
`type` | RB first try to find if `req` and its `Accept` header found. If not so, this one determines what  default `Content-Type` header to be sent. | will not set any `Content-Type` | String | 'application/json' | Either `req` not found or its `Accept` is not amongs `xml`, `html` or `plain`
`successStatus` | Success status sode to be sent | 304 | Integer(100-600)  | 200 | Success Handler Called
`errorStatus` | Error status sode to be sent | 304 | Integer(100-600)  | 400 | Error Handler Called
`errorCode` | These are the custom/application error code. So that if end user find this error code in response, one may refer some error code ref page and find reason and how to get rid of that error. | No error code will be set | String without space  | false | `errorKey` and Error handler called
`errorCodeKey` | with which key errorCode to be associated in error object | String  | 'errorCode' | false | `errorCode` is set and error handler called
`noResultStatus` | What status code to be sent if none of error and successResult found | 304 | Integer(100-600)  | 404 | none of error or successResult found
`noResultError` | What Error message to be sent if none of error and successResult found | if `noResultStatus` found and `noResultError` not found, response will be send without body | String  | 'Record not found' | `noResultStatus`
`successCallback` | Builder will build the successObject and then handler will call this function instead of sending to client. Usefull in cases when you want to perform nested database operations before sending final response | Response will be sent to client | Function that get successResult as first parameter  | false | success handler called
`filterProperties` | To remove the fields in response that are critical when known to client eg password, some private key etc. | No fields will be removed | String containing space separated keys | false | success handler called
`filterDepth` | to the depth in which the `filterProperties` will be searched to remove from the main success object. | Will only filterOut root properties | Integer(1-29) | 1 | `filterProperties` found
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

Examples are taken after using RB with a nodejs web application **lets-chat**, that is also open source, and available [here](https://github.com/sdelements/lets-chat).

#### Setting globally the errorKey as `errors`, with which each error information/object will be linked whenever an error response to be sent to client
```javascript
  require('response-builder').setOptions({ errorKey : 'errors' });
```
#### Adding additional `message` with error object, applicable only in cases where error found.
Before without RB :
```javascript
            core.account.update(req.user._id, data, function (err, user) {
                if (err) {
                    return res.json({
                        status: 'error',
                        message: 'Unable to update your profile.',
                        errors: err
                    });
                }

                if (!user) {
                    return res.sendStatus(404);
                }

                res.json(user);
            });
```
After with RB :
```javascript
            core.account.update(req.user._id, data, RB.build(res, { message : 'Unable to update your profile.' }).all);
```
#### Build once with `request` pair specific options, and handle many places.
Before without RB :
```javascript
             if (req.user.using_token) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Cannot change account settings ' +
                             'when using token authentication.'
                });
             }

             // ... some other code

            auth.authenticate(req, req.user.uid || req.user.username,
                              data.currentPassword, function(err, user) {
                if (err) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'There were problems authenticating you.',
                        errors: err
                    });
                }

                if (!user) {
                    return res.status(401).json({
                        status: 'error',
                        message: 'Incorrect login credentials.'
                    });
                 }

                 core.account.update(req.user._id, data, function (err, user, reason) {
                     if (err || !user) {
                        return res.status(400).json({
                             status: 'error',
                             message: 'Unable to update your account.',
                             reason: reason,
                             errors: err
                         });
                    }
                    res.json(user);
                 });
            });
```
After with RB :
```javascript
        // Building once with options to add status and errorKey to error object whenever an error occurs
            var sendResponse = RB.build(res,{ addToError : { status : 'error', errorKey : 'message' } });
             if (req.user.using_token) {
                return sendResponse.error('Cannot change account settings when using token authentication.',403);
             }

        // .... some code
        // Now, Setting up runtime options, so as to handle rest of block code with new options going to be used ahead.
            sendResponse.addToError.message = 'There were problems authenticating you.'; // addToError was already defined at time of building. Just updating it again for rest of code

        // all done, now use it in one line
            auth.authenticate(req, req.user.uid || req.user.username, data.currentPassword, sendResponse.callIfSuccess(function(user){
              // setting up callback, which tell hander not to send response to client rather callback with success object here
                sendResponse.errorKey = false;
                 core.account.update(req.user._id, data, function (err, user, reason) {
                     if (err || !user) {
                        sendResponse.error({
                             status: 'error',
                             message: 'Unable to update your account.',
                             reason: reason,
                             errors: err
                         });
                    } else sendResponse.success(user);
                 });
              }));
```
#### Adding `successKey` with which the raw success object will be linked, Adding few other properties with option `addToSuccess` that should be added in success response whenever a success response to be sent to client
Before without RB :
```javascript
             if (req.user.using_token) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Cannot generate a new token ' +
                             'when using token authentication.'
                });
             }

            core.account.generateToken(req.user._id, function (err, token) {
                if (err) {
                    return res.json({
                        status: 'error',
                        message: 'Unable to generate a token.',
                        errors: err
                    });
                }

                res.json({
                    status: 'success',
                    message: 'Token generated.',
                    token: token
                });
            });
```
After with RB :
```javascript
            var sendResponse = RB.build(res, { successKey : 'token',
                addToError : { status : 'error' },
                addToSuccess : { status : 'success', message : 'Token generated.' } }); // `addToSuccess`, object to be merged with success response
             if (req.user.using_token) {
                sendResponse.errorKey = 'message';
                return sendResponse.error('Cannot generate a new token when using token authentication.',403);
             }

            sendResponse.addToError.message = 'Unable to generate a token.';
            core.account.generateToken(req.user._id, sendResponse.all);
```
#### Use option `defaultError` and/or `defaultSuccess` to send to client in case no raw error OR no raw success object, respectively, is found. Remember to set `noResultStatus` as false, in order to treat `no raw success` as a success case.
Before without RB :
```javascript
             if (req.user.using_token) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Cannot revoke token ' +
                             'when using token authentication.'
                });
             }

            core.account.revokeToken(req.user._id, function (err) {
                if (err) {
                    return res.json({
                        status: 'error',
                        message: 'Unable to revoke token.',
                        errors: err
                    });
                }

                res.json({
                    status: 'success',
                    message: 'Token revoked.'
                });
            });
```
After with RB :
```javascript
            var sendResponse = RB.build(res, {
              // setting up noResultStatus as false, so that even if there is no second parameter found while calling `all` handler, it should reflect success case with defaultSuccess
                noResultStatus : false, successKey : 'message', defaultSuccess : 'Token revoked',
                addToError : { status : 'error' },
                addToSuccess : { status : 'success' } });
             if (req.user.using_token) {
                sendResponse.errorKey = 'message';
                return sendResponse.error('Cannot revoke token when using token authentication.',403);
             }

            sendResponse.addToError.message = 'Unable to revoke token.';
            core.account.generateToken(req.user._id, sendResponse.all);
```
#### Setting up default `successStatus` to be set for a block of code and combined example of how to use pre-process the errors with `preProcessError`
Before without RB :
```javascript
             if (req.user ||
                 !auth.providers.local ||
                 !auth.providers.local.enableRegistration) {

                return res.status(403).json({
                    status: 'error',
                    message: 'Permission denied'
                });
             }

             var fields = req.body || req.data;
             // ... some other code
             var passwordConfirm = fields.passwordConfirm || fields.passwordconfirm || fields['password-confirm'];

             if (fields.password !== passwordConfirm) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Password not confirmed'
                });
             }

             var data = {
             // ... some other code
                 displayName: fields.displayName || fields.displayname || fields['display-name']
             };

            core.account.create('local', data, function(err, user) {
                if (err) {
                    var message = 'Sorry, we could not process your request';
                    // User already exists
                    if (err.code === 11000) {
                        message = 'Email has already been taken';
                    }
                    // Invalid username
                    if (err.errors) {
                        message = _.map(err.errors, function(error) {
                            return error.message;
                        }).join(' ');
                    // If all else fails...
                    } else {
                        console.error(err);
                    }
                    // Notify
                    return res.status(400).json({
                        status: 'error',
                        message: message
                    });
                 }

                res.status(201).json({
                    status: 'success',
                    message: 'You\'ve been registered, ' +
                             'please try logging in now!'
                });
            });
```
After with RB :
```javascript
            var sendResponse = RB.build(res, { errorKey : 'message', successStatus : 201,
                addToError : { status : 'error' },
                addToSuccess : { status : 'success', message: 'You\'ve been registered, please try logging in now!' } });

             if (req.user ||
                 !auth.providers.local ||
                 !auth.providers.local.enableRegistration) {

                return sendResponse.error('Permission denied.',403);

             }

             var fields = req.body || req.data;
             // ... some other code
             var passwordConfirm = fields.passwordConfirm || fields.passwordconfirm || fields['password-confirm'];

             if (fields.password !== passwordConfirm) {
                return sendResponse('Password not confirmed');
             }

             var data = {
             // ... some other code
                 displayName: fields.displayName || fields.displayname || fields['display-name']
             };

            sendResponse.preProcessError = function(err){ // custom preProcessing function for this specific case, You can also set custom preProcessing when used with `setOptions` globally
                var message = 'Sorry, we could not process your request';
                // User already exists
                if (err.code === 11000) {
                    message = 'Email has already been taken';
                 }
                // Invalid username
                if (err.errors) {
                    message = _.map(err.errors, function(error) {
                        return error.message;
                    }).join(' ');
                // If all else fails...
                }
                return message;
            };
            core.account.create('local', data, sendResponse.all);
```
#### The `ON FLY` options on second and third parameter in error handler. See above 'How to use options' [section](https://github.com/nodeofcode/response-builder#how-to-set-options) for description
Before without RB :
```javascript
             auth.authenticate(req, function(err, user, info) {
                 if (err) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'There were problems logging you in.',
                        errors: err
                    });
                 }

                 if (!user && info && info.locked) {
                    return res.status(403).json({
                        status: 'error',
                        message: info.message || 'Account is locked.'
                    });
                 }

                 if (!user) {
                    return res.status(401).json({
                        status: 'error',
                        message: info && info.message ||
                                 'Incorrect login credentials.'
                    });
                 }

                req.login(user, function(err) {
                    if (err) {
                        return res.status(400).json({
                            status: 'error',
                            message: 'There were problems logging you in.',
                            errors: err
                        });
                    }
                     var temp = req.session.passport;
                    req.session.regenerate(function(err) {
                        if (err) {
                            return res.status(400).json({
                                status: 'error',
                                message: 'There were problems logging you in.',
                                errors: err
                            });
                        }
                         req.session.passport = temp;
                        res.json({
                            status: 'success',
                            message: 'Logging you in...'
                        });
                    });
                });
```
After with RB :
```javascript
            var sendResponse = RB.build(res, { successKey : 'result', noResultStatus : false,
                addToError : { status : 'error', message : 'There were problems logging you in.' },
                addToSuccess : { status : 'success', message: 'Logging you in...' } });
             auth.authenticate(req, function(err, user, info) {
                 if (err) {
                    return sendResponse.error(err); // no any on fly option
                 }

                 if (!user && info && info.locked) {
                    return sendResponse.error(err, 403, { message : info.message || 'Account is locked.' }); //On the fly setting status 403 and adding `message` property on the fly to the error object just before sending to client
                 }

                 if (!user) {
                    return sendResponse.error(err, 401, { message : info && info.message || 'Incorrect login credentials.' });
                 }

                req.login(user, sendResponse.callIfSuccess(function(){
                    var temp = req.session.passport;
                    sendResponse.preProcessSuccess = function(){
                         req.session.passport = temp;
                    };
                    req.session.regenerate(sendResponse.all);
                }));
```
#### Build with runtime options and use instantly with `all` handler
Before without RB
```javascript
            core.messages.create(options, function(err, message) {
                if (err) {
                    return res.sendStatus(400);
                }
                res.status(201).json(message);
            });
```
After with RB
```javascript
            core.messages.create(options, RB.build(res, { successStatus : 201 }).all); // setting up `successStatus` for this builder and handler only
```
ignore second parameter if does not want to provide runtime options.
Before without RB
```javascript
            core.messages.list(options, function(err, messages) {
                if (err) {
                    return res.sendStatus(400);
                }
                res.json(messages);
            });
```
After with RB
```javascript
            core.messages.list(options, RB.build(res).all); // no run time option
```
#### Did not found any one suitable for your case. Just open a [issue](https://github.com/nodeofcode/response-builder/issues) describing your case, and in response to that you will get that specific `builder`.

## Roadmap
> Raise a feature request by logging an [issue](https://github.com/nodeofcode/response-builder/issues), and that will fill this place

## Any hurdles?
> Found anything difficult to understand? or some bug or some improvement?. Create an issue [issue](https://github.com/nodeofcode/response-builder/issues) for the same.

## License

ResponseBuilder is released under the MIT license:

http://www.opensource.org/licenses/MIT
