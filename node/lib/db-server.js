"use strict";

var common = require('./common')
var api = require('./db-rest-api')

var connect = common.connect
var everyauth = common.everyauth


function init_social_login() {
	
	function make_promise(user, promise) {
		api.saveUser(user, function(err, user) {
			if (err) 
				return promise.fail(err);

			promise.fulfill(user);
		});
		
		return promise;
	}
	
	// turn on to see OAuth flow
	//everyauth.debug = true

	everyauth.everymodule
		.findUserById(function (id, callback) {
			api.loadUser(id, function (err, user) {
				if (err) 
					return callback(err);
					
				callback(null, user);
      		});
    	})
    	.moduleErrback(function (err, data) {
      		if (err) { 
				console.dir(err);
				throw err;
			}
	});

	everyauth.twitter
		.consumerKey(process.env.TWITTER_KEY)
		.consumerSecret(process.env.TWITTER_SECRET)
		.findOrCreateUser(function (session, accessToken, accessTokenSecret, twitterUserMetadata) {
			var user = { 
				id: 'tw-'+twitterUserMetadata.id, 
				username: twitterUserMetadata.screen_name, 
				service: 'twitter',
				key: accessToken,
				secret: accessTokenSecret
			}

			return make_promise(user, this.Promise());
		})
		.redirectPath('/');			
}


function init() {

	init_social_login();
	
    var server = connect.createServer();
	
    server.use(connect.logger());
    server.use(connect.bodyParser());
	server.use(connect.cookieParser());
    server.use(connect.query());
	server.use(connect.session({secret: process.env.SESSION_KEY }));

	server.use(everyauth.middleware());
	
    server.use(function(req, res, next) {
        res.sendjson$ = function(obj) {
            common.sendjson(res, obj)
        }

        res.send$ = function(code, text) {
            res.writeHead(code, '' + text)
            res.end()
        }

        res.err$ = function(win) {
            return function(err, output) {
                if (err) {
                    console.log(err)
                    res.send$(500, err)
                } else {
                    win && win(output)
                }
            }
        }

        next();
    });

    var router = connect.router(function(app) {
        app.get('/api/ping', api.ping)
        app.get('/api/echo', api.echo)
        app.post('/api/echo', api.echo)

        app.post('/api/rest/report', api.rest.create)
        // app.get('/api/rest/report/:id', api.rest.read)
        app.get('/api/rest/report', api.rest.list)
        // app.put('/api/rest/report/:id', api.rest.update)
        // app.del('/api/rest/report/:id', api.rest.del)

		app.get('/user', api.rest.get_user)
    })
    server.use(router)

    server.use(connect.static(__dirname + '/../../site/public'))

	api.connect({ 
			name:'reports', 
			server: 'staff.mongohq.com', 
			port: 10052, 
			username: 'app', 
			password: process.env.DB_PWD 
		},
	    
		function(err) {
	      	if (err) 
				return console.log('Failed to connect to db: ' + err);

			var port = process.env.PORT || 8180;
	      	server.listen(port)
	    }
	);
  
}


init()
