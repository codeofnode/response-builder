# ResponseBuilder (Experimental)
## Build the success and error responses in nodejs application and manage WHAT to be sent to client.

Usually in a NodeJS App, we play around with loads of callbacks each with order of parameters `err`, `successResult`, `extraResult`. Each of these callback usually have similar kind of handling. Eg,
* if error found then set status as 400, log error on console or file (for debugging), and send the error response.
* If result not found, then send 404.
* Some of us also like to link a unique request or version of API being used, to be sent to client for future reference.
* many more ..

### ResponseBuilder does all these in very little space of single line of code.

**An nodejs with [Mongoose](mongoosejs.com), Example**

Before :
```javascript
    MongooseModel.get({ _id : some_id }, function(err, docs) {
        if (err) {
            console.error(err);
            res.status(400);
            return res.json({
              ok : false
              error : err
            });
        }

        if (!doc) {
            res.status(404);
            return res.json({
              ok : false,
              error : 'Document not found'
            });
        }

        res.json(docs);
    });
```
After :
```javascript
    MongooseModel.get({ _id : some_id }, RB.build(res).all);  // where RB = require('response-builder')
```

## Stay tuned for API Documentation ...

## License

ResponseBuilder is released under the MIT license:

http://www.opensource.org/licenses/MIT
