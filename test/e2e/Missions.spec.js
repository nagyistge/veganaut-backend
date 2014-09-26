'use strict';
/* global it, expect */

var _ = require('lodash');
var h = require('../helpers_');
var FixtureCreator = require('../fixtures/FixtureCreator').FixtureCreator;

var fix = new FixtureCreator();
fix
    .user('alice', 'team1')
    .location('alice', 'Tingelkringel')
;

h.describe('Basic functionality of Missions API methods.', {fixtures: fix, user: 'alice@example.com'}, function() {
    it('can submit a mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'hasOptions',
                    outcome: true,
                    points: { team1: 10 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    var mission = res.body;
                    expect(typeof mission.id).toBe('string', 'id is a string');
                    expect(typeof mission.person).toBe('string', 'person is a string');
                    expect(typeof mission.location).toBe('string', 'location is a string');
                    expect(typeof mission.completed).toBe('string', 'completed is a string');
                    expect(typeof mission.completed).toBe('string', 'completed is a string');
                    expect(typeof mission.points).toBe('object', 'points is an object');
                    expect(mission.type).toBe('hasOptions', 'type is hasOptions');
                    expect(mission.causedOwnerChange).toBe(false, 'did not cause an owner change');
                    expect(mission.outcome).toBe(true, 'outcome of the mission');
                    done();
                })
            ;
        });
    });

    it('can submit visitBonus mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'visitBonus',
                    outcome: true,
                    points: { team1: 100 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('visitBonus', 'type of mission');
                    expect(res.body.points).toEqual({team1: 100}, 'points of mission');
                    done();
                })
            ;
        });
    });

    it('can submit hasOptions mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'hasOptions',
                    outcome: true,
                    points: { team1: 10 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('hasOptions', 'type of mission');
                    expect(res.body.points).toEqual({team1: 10}, 'points of mission');
                    done();
                })
            ;
        });
    });

    it('can submit wantVegan mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'wantVegan',
                    outcome: {
                        expressions: ['vegan', 'noMeat'],
                        others: ['ganz vegetarisch']
                    },
                    points: { team1: 10 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('wantVegan', 'type of mission');
                    expect(res.body.points).toEqual({team1: 10}, 'points of mission');
                    done();
                })
            ;
        });
    });

    it('can submit whatOptions mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'whatOptions',
                    outcome: [
                        {
                            product: {
                                name: 'Curry'
                            },
                            info: 'available'
                        },
                        {
                            product: {
                                name: 'Smoothie'
                            },
                            info: 'available'
                        }
                    ],
                    points: { team1: 10 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('whatOptions', 'type of mission');
                    expect(res.body.points).toEqual({team1: 10}, 'points of mission');
                    done();
                })
            ;
        });
    });

    it('can submit buyOptions mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'buyOptions',
                    outcome: [
                        {
                            product: {
                                name: 'Curry'
                            }
                        },
                        {
                            product: {
                                name: 'Smoothie'
                            }
                        }
                    ],
                    points: { team1: 20 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('buyOptions', 'type of mission');
                    expect(res.body.points).toEqual({team1: 20}, 'points of mission');
                    done();
                })
            ;
        });
    });

    it('can submit rateOptions mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'rateOptions',
                    outcome: [
                        {
                            product: {
                                name: 'Curry'
                            },
                            info: 5
                        },
                        {
                            product: {
                                name: 'Smoothie'
                            },
                            info: 4
                        }
                    ],
                    points: { team1: 10 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('rateOptions', 'type of mission');
                    expect(res.body.points).toEqual({team1: 10}, 'points of mission');
                    done();
                })
            ;
        });
    });

    it('can submit giveFeedback mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'giveFeedback',
                    outcome: {
                        feedback: 'Moar sauce',
                        didNotDoIt: false
                    },
                    points: { team1: 20 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('giveFeedback', 'type of mission');
                    expect(res.body.points).toEqual({team1: 20}, 'points of mission');
                    done();
                })
            ;
        });
    });

    it('can submit offerQuality mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'offerQuality',
                    outcome: 4,
                    points: { team1: 10 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('offerQuality', 'type of mission');
                    expect(res.body.points).toEqual({team1: 10}, 'points of mission');
                    done();
                })
            ;
        });
    });

    it('can submit offerQuality mission', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000003',
                    type: 'effortValue',
                    outcome: 1,
                    points: { team1: 10 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('effortValue', 'type of mission');
                    expect(res.body.points).toEqual({team1: 10}, 'points of mission');
                    done();
                })
            ;
        });
    });
});

h.describe('Products missions can refer to existing products.', function() {
    it('can submit rateOptions mission with an existing product', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000006',
                    type: 'rateOptions',
                    outcome: [
                        {
                            product: '000000000000000000000101',
                            info: 1
                        },
                        {
                            product: '000000000000000000000102',
                            info: 2
                        }
                    ],
                    points: { team1: 10 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.type).toBe('rateOptions', 'type of mission');
                    expect(res.body.points).toEqual({team1: 10}, 'points of mission');
                    done();
                })
            ;
        });
    });
});

h.describe('Mission API methods and their influence on locations.', function() {
    it('location can change owner when new mission is submitted', function() {
        h.runAsync(function(done) {
            h.request('POST', h.baseURL + 'mission')
                .send({
                    location: '000000000000000000000006', // Mission in dosha
                    type: 'visitBonus',
                    outcome: true,
                    points: { team1: 100 }
                })
                .end(function(res) {
                    expect(res.statusCode).toBe(201);
                    expect(res.body.causedOwnerChange).toBe(true, 'mission caused an owner change');

                    // TODO: would be best to only request the updated location
                    h.request('GET', h.baseURL + 'location/list')
                        .end(function(res) {
                            expect(res.statusCode).toBe(200);

                            var dosha = _.first(_.where(res.body, {id: '000000000000000000000006'}));
                            expect(dosha).toBeDefined('returned dosha');
                            expect(dosha.team).toBe('team1', 'owner is now team1');
                            expect(typeof dosha.points.team1).toBe('number', 'has team1 points');
                            expect(typeof dosha.points.team2).toBe('number', 'has team2 points');
                            expect(dosha.points.team1).toBeGreaterThan(dosha.points.team2, 'has more team1 than team2 points');

                            done();
                        })
                    ;
                })
            ;
        });
    });
});
