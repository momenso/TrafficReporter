// API implementation
var common = require('./common')

var uuid = common.uuid
var mongodb = common.mongodb


var reportcoll = null;
var usercoll = null;

var util = {}
util.validate = function(input) {
    return true; //input.text
}

util.fixid = function(doc) {
    if (doc._id) {
        doc.id = doc._id.toString()
        delete doc._id
    } else if (doc.id) {
        doc._id = new mongodb.ObjectID(doc.id)
        delete doc.id
    }

    return doc
}


exports.ping = function(req, res) {
    var output = {
        ok: true,
        time: new Date()
    }
    res.sendjson$(output)
}


exports.echo = function(req, res) {
    var output = req.query

    if ('POST' == req.method) {
        output = req.body
    }

    res.sendjson$(output)
}

exports.saveUser = function(user, callback) {
	console.log('>>> SAVEUSER: ' + user.username);
	
	usercoll.update({ id: user.id }, user, { upsert: true }, function(err, doc) {
		console.log('User saved ' + (err || 'successfully.'));
		//callback(err, doc);
		callback(err, user);
	});
}

exports.loadUser = function(id, callback) {
    console.log(">>> LOADUSER: " + id);

    var query = { id: id };

    usercoll.findOne(query, function(err, doc) {
        if (doc) {
            var output = util.fixid(doc);
			callback(err, output);
        } else {
			callback('User ' + id + ' not found');
		}
    });
}

exports.rest = {	

	get_user: function(req, res, next) {
		
		console.log("get_user: " + req.user);
		
		var clean_user = { };
		
		if (req.user) {
			clean_user.id = req.user.id
			clean_user.username = req.user.username
			clean_user.service = req.user.service
		} else {
			console.log("No user specified?")
		}

		//common.util.sendjson(res,clean_user)
		//res.sendjson$(clean_user);
		common.sendjson(res, clean_user);
	},

    create: function(req, res) {
        console.log('>>> CREATE')

        var input = req.body

        if (!util.validate(input)) {
            return res.send$(400, 'invalid');
        }

        var report = {
			location: input.location,
            speed: input.speed,
			comment: input.comment,
            created: new Date().getTime(),
        }

        reportcoll.insert(report, res.err$(function(docs) {
            var output = util.fixid(docs[0]);
            res.sendjson$(output);
        }))
    },


    read: function(req, res) {
        console.log(">>> READ: " + req.params)

        var input = req.params

        var query = util.fixid({
            id: input.id
        })

        reportcoll.findOne(query, res.err$(function(doc) {
            if (doc) {
                var output = util.fixid(doc)
                res.sendjson$(output)
            } else {
                res.send$(404, 'not found')
            }
        }))
    },


    list: function(req, res) {

        console.log('>>> LIST');

        var input = req.query
        var output = []

        var query = { location: input.location }
        var options = {
            sort: [['created', 'desc']]
        }

        reportcoll.find(query, options, res.err$(function(cursor) {
            cursor.limit(3).toArray(res.err$(function(docs) {
                output = docs
                output.forEach(function(item) {
                    util.fixid(item)
                })
                res.sendjson$(output)
            }))
        }))
    },


    update: function(req, res) {
        var id = req.params.id
        var input = req.body

        console.log('>>> UPDATE: ' + id)
        console.log('INPUT = ' + input.done)

        if (!util.validate(input)) {
            return res.send$(400, 'invalid')
        }

        var query = util.fixid({
            id: id
        })
        reportcoll.update(query, {
            $set: {
                text: input.text,
				done: input.done
            }
        },
        res.err$(function(err) {
			if (err) {
                console.log('404')
                res.send$(404, 'not found')
			}
            else {
                // var output = util.fixid(doc)
                // res.sendjson$(output)
				res.end('Success');
            }
        }))
    },


    del: function(req, res) {
        console.log('>>> DELETE')

        var input = req.params

        var query = util.fixid({
            id: input.id
        })
        reportcoll.remove(query, res.err$(function() {
            var output = {};
            res.sendjson$(output);
        }))
    }

}


exports.connect = function(options, callback) {

    options.name = options.name || 'reports';
    options.server = options.server || '127.0.0.1';
    options.port = options.port || 27017;

    var server = new mongodb.Server(options.server, options.port, { auto_reconnect:true });
    var db = new mongodb.Db(options.name, server);
	db.open(function(err, client) {
        if (err) return callback(err);

		client.authenticate(options.username, options.password, function(err) {
			if (err) return callback(err);
		});
		
        db.collection('reports', function(err, collection) {
            if (err) return callback(err);

			console.log('Reports collection loaded.');
            reportcoll = collection;
            callback(/*null, database*/);
        });

		// loads the users collection
		db.collection('users', function(err, collection) {
			if (err) return callback(err);
			
			console.log('Users collection loaded.');
			usercoll = collection;
			callback();
		});
    })
}
