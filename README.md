## Loglytics-Platform
This repo contains source code for both backend and frontend of loglytics.
Loglytics is webapp that allows to receive logs from Android apps in real-time.
The Android library is available at [Loglytics library](https://github.com/CVeniamin/loglytics_library).
Deploy your own server, create an account to get the API key that is needed by the library.

##### Backend stack
- SocketIO server-side
- ExpressJS 
- PassportJS (Used for local/google/github authentication)
- MongooseJS (mLab Database connector)
- Browserify (Bundles SocketIO client-side code)
##### Frontend stack
- SocketIO client-side
- EJS (view engine)
- Bootstrap 4
- Google Charts
    
SocketIO server-side acts as a service which waits for logs and is responsible for broadcasting logs to specific SocketIO clients.

## Installation
To start create a file named `config.js` inside `config/` which only contains server URL where platform is deployed e.g., `http://localhost:8080`
```js
    module.exports = {
        'url': 'http://localhost:8080/' //or any other endpoint
    };
``` 

Finished that you also need to configure a MongoDB database connection which can be done with [mLab](https://mlab.com).
Create a new file named `database.js` inside `config/` containig your database endpoint as follows.

```js
    module.exports = {
        'url': 'mongodb://<dbuser>:<dbpassword>@ds111103.mlab.com:11103/<dbname>'
    };
```

Then create `auth.js` also inside `config/` which contains Google+ and Github credentials used to authenticate users with OAuth.

```js
    var config = require("./config");
    
    module.exports = {
        'googleAuth': {
            'clientID': '<GOOGLE_CLIENT_ID>',
            'clientSecret': '<GOOGLE_CLIENT_SECRET>',
            'callbackURL': config.url + 'auth/google/callback'
        },
        'githubAuth': {
            'clientID': '<GITHUB_CLIENT_ID>',
            'clientSecret': '<GITHUB_CLIENT_SECRET>',
            'callbackURL': config.url + 'auth/github/callback'
        }
    };
``` 

Make sure that your Google+/Github OAuth configuration matches callbacks defined on `auth.js` if not change accordingly to specified here.

Completed the steps above then you can run `npm install`  and `node server.js` if testing locally or deploy the repo to [heroku](https://www.heroku.com/).
