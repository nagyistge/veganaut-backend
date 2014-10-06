/**
 * Module dependencies.
 */
'use strict';
var express = require('express');
var mongoose = require('mongoose');
var cors = require('cors');

var http = require('http');

// Models
require('./app/models/Activity.js');
require('./app/models/ActivityLink.js');
require('./app/models/GraphNode.js');
require('./app/models/Person.js');
require('./app/models/Missions.js');
require('./app/models/Location.js');

// Controllers
var Activity = require('./app/controllers/Activity');
var ActivityLink = require('./app/controllers/ActivityLink');
var GeoIP = require('./app/controllers/GeoIP');
var Graph = require('./app/controllers/Graph');
var Location = require('./app/controllers/Location');
var Match = require('./app/controllers/Match');
var Missions = require('./app/controllers/Missions');
var Person = require('./app/controllers/Person');
var Score = require('./app/controllers/Score');
var Session = require('./app/controllers/Session');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());

// Try to add the logged in user
app.use(Session.addUserToRequest);

app.use(app.router);

// TODO: what does this guy do exactly?
// development only
//if ('development' === app.get('env')) {
//    app.use(express.errorHandler());
//}

/*
 * Routes
 * Following the route-separation express example:
 * https://github.com/visionmedia/express/blob/master/examples/route-separation/index.js
 */
// Home
app.options('/', cors());
app.get('/', function(req, res) {
    res.send({ status: 'OK' });
});


// Graph
app.options('/graph/me', cors());
app.options('/graph/:personId', cors());
app.options('/graph', cors());
app.get('/graph/me', cors(), Session.restrict, Graph.view);
app.get('/graph/:personId', cors(), Graph.viewById);
app.put('/graph/me', cors(), Session.restrict, Graph.update);

// Session
app.options('/session', cors());
app.post('/session', cors(), Session.create);
app.delete('/session', cors(), Session.restrict, Session.delete);

// Activity
app.options('/activity', cors());
app.get('/activity', cors(), Session.restrict, Activity.list);

// ActivityLink
app.options('/activityLink/reference', cors());
app.options('/activityLink', cors());
app.options('/activityLink/mine/open', cors());
app.post('/activityLink/reference', cors(), ActivityLink.referenceCode);
app.post('/activityLink', cors(), Session.restrict, ActivityLink.link);
app.get('/activityLink/mine/open', cors(), Session.restrict, ActivityLink.openList);

// Person
app.options('/person', cors());
app.post('/person', cors(), Person.register);
app.options('/person/me', cors());
app.get('/person/me', cors(), Session.restrict, Person.getMe);
app.put('/person/me', cors(), Session.restrict, Person.updateMe);

// Match
app.options('/match', cors());
app.get('/match', cors(), Match.current);

// Mission
app.options('/mission', cors());
app.post('/mission', cors(), Session.restrict, Missions.submit);

// Location
app.options('/location', cors());
app.post('/location', cors(), Session.restrict, Location.location);
app.options('/location/list', cors());
app.get('/location/list', cors(), Location.list);
app.options('/location/:locationId', cors());
app.get('/location/:locationId', cors(), Location.get);

// Score
app.options('/score', cors());
app.get('/score', cors(), Session.restrict, Score.stats);

// GeoIP
app.options('/geoip', cors());
app.get('/geoip', cors(), GeoIP.get);

// Handle errors and if no one responded to the request
app.use(function(err, req, res, next) {
    // Check if we got an error
    if (err) {
        // TODO: should have the status code on the Error object
        if (res.statusCode < 400) {
            // If no error status code has been set, use 500 by default
            res.status(500);
        }

        // Send the error details
        res.send({ error: err.message, details: err.details });
    }
    else {
        // No error given, still ended up here, must be 404
        res.send(404, { error: 'method not found' });
    }
    next();
});

// server
var server = http.createServer(app);
if (require.main === module) {
    mongoose.connect('mongodb://localhost/veganaut', function(err) {
        if (err) {
            console.log('Could not connect to Mongo: ', err);
            process.exit();
        }

        server.listen(app.get('port'), function(err) {
            if (err) {
                console.log('Could not listen: ', err);
                process.exit();
            }

            console.log('Running in ' + app.settings.env + ' environment');
            console.log('Express server listening on port ' + app.get('port'));
        });
    });
}

module.exports = server;
