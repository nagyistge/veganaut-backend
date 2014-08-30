'use strict';

var _ = require('lodash');
var async = require('async');

var mongoose = require('mongoose');
var Location = mongoose.model('Location');
var Visit = mongoose.model('Visit');

exports.location = function(req, res, next) {
    var location = new Location(_.pick(req.body, 'coordinates', 'name', 'type'));

    // Create first visit at this location with the addLocation mission completed
    // TODO: this should probably go in the Location Model pre save or something, then one can also change FixtureCreator.location
    var visit = new Visit({
        person: req.user.id,
        location: location.id,
        completed: new Date(), // TODO: it should set this as default
        missions: [{
            type: 'addLocation',
            outcome: true
        }]
    });

    location.save(function(err) {
        if (err) {
            return next(err);
        }
        visit.save(function(err) {
            if (err) {
                return next(err);
            }
            return res.send(location);
        });
    });
};


exports.list = function(req, res, next) {
    Location.find(function(err, locations) {
        if (err) {
            return next(err);
        }

        async.each(locations, function(location, cb) {
            async.series([
                location.populateRecentVisits.bind(location),
                function(cb) {
                    location.calculateNextVisitBonusDate(req.user, cb);
                }
            ], cb);
        }, function(err) {
            if (err) {
                return next(err);
            }
            locations = _.map(locations, function(l) {
                l.calculatePoints();
                return l.toApiObject(req.user);
            });
            return res.send(locations);
        });
    });
};
