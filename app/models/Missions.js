/**
 * Mongoose models for Missions. There is a base Mission model
 * that is not used directly and one discriminator for every
 * mission type.
 */

'use strict';

var util = require('util');
var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constants = require('../utils/constants');

/**
 * Map of mission types to the number of points it gives
 * TODO: there is an identical list in the frontend, share this code!
 * TODO: Is there really still?
 * @type {{}}
 */
var POINTS_BY_TYPE = {
    AddLocationMission:  10, // TODO: make sure one cannot submit this mission explicitly
    VisitBonusMission:   50,
    HasOptionsMission:   10,
    WantVeganMission:    10,
    WhatOptionsMission:  10, // TODO: this should be renamed to something with "Product" and only work on one product
    BuyOptionsMission:   20,
    RateProductMission:   5,
    SetProductNameMission: 0, // Give no points for this mission currently so it doesn't show up as a suggested mission
    // TODO: should give points to confirm the existing name

    SetProductAvailMission: 5,
    GiveFeedbackMission: 10,
    OfferQualityMission: 20,
    EffortValueMission:  20,
    LocationTagsMission: 20
};

/**
 * Time in ms until a mission is available again
 * @type {{}}
 */
var MISSION_COOL_DOWN_PERIOD = {
    // TODO: make the periods all longer?
    AddLocationMission:   0, // none
    VisitBonusMission:    1000 * 60 * 60 * 24 * 7 * 3, // 3 weeks
    HasOptionsMission:    1000 * 60 * 60 * 24, // 1 day
    WantVeganMission:     1000 * 60 * 60 * 24, // 1 day
    WhatOptionsMission:   0, // none
    BuyOptionsMission:    1000 * 60 * 60 *  4, // 4 hours
    RateProductMission:   1000 * 60 * 60 * 24 * 7 * 3, // 3 weeks
    SetProductNameMission: 1000 * 60 * 60 * 24 * 30 * 6, // ~6 months
    SetProductAvailMission: 1000 * 60 * 60 *  4, // 4 hours
    GiveFeedbackMission:  1000 * 60 * 60 * 24, // 1 day
    OfferQualityMission:  1000 * 60 * 60 * 24 * 7 * 3, // 3 weeks
    EffortValueMission:   1000 * 60 * 60 * 24 * 7 * 3,  // 3 weeks
    LocationTagsMission:  1000 * 60 * 60 * 24 * 7 * 3  // 3 weeks
};

/**
 * Returns the Identifier for the given mission model name (type)
 *
 * @param {string} modelName
 * @returns {string}
 */
var getIdentifierForModelName = function(modelName) {
    return modelName.charAt(0).toLowerCase() + modelName.substr(
        1, modelName.length - 1 - 'Mission'.length
    );
};

// Object to hold all the missions that will be exported
var allMissions = {};

/**
 * Constructs a new mission schema
 * @param outcomeType Mongoose type description for the outcome
 * @constructor
 */
var MissionSchema = function(outcomeType) {
    // Create the base schema
    Schema.call(this, {
        person: {type: Schema.Types.ObjectId, ref: 'Person', required: true},
        location: {type: Schema.Types.ObjectId, ref: 'Location', required: true},
        points: {type: Number, default: 0, required: true}, // TODO: don't set a default of 0, points should be set in pre-validate
        completed: {type: Date},
        isFirstOfType: {type: Boolean},
        isNpcMission: {type: Boolean, default: false}
    });

    // Add the outcome (unless we're in the base schema, which doesn't have it)
    if (typeof outcomeType !== 'undefined') {
        this.add({
            outcome: outcomeType
        });
    }
};
util.inherits(MissionSchema, Schema);

var missionSchema = new MissionSchema();
missionSchema.pre('save', function(next) {
    var that = this;
    var missionType = that.getType();

    if (typeof that.isFirstOfType === 'undefined') {
        that.getNonNpcMissionCount(missionType, that.location, function(err, count) {
            if (err) {
                return next(err);
            }
            that.isFirstOfType = (count <= 0);
            return next();
        });
    }
    else {
        return next();
    }
});

// Get the last same mission from that user
missionSchema.pre('save', function(next) {
    var that = this;

    if (typeof that._previousCompletedMission === 'undefined') {
        // Select the mission of the same type at the same location by the same person
        var previousMissionQuery = {
            __t: that.getType(),
            location: that.location,
            person: that.person
        };

        // If it's a product mission, the product also has to be the same
        if (that.isProductModifyingMission()) {
            previousMissionQuery['outcome.product'] = that.outcome.product;
        }

        allMissions.Mission.findOne(previousMissionQuery).sort({
            completed: 'desc'
        }).exec(function(err, previousMission) {
            if (err) {
                return next(err);
            }

            // If a previous mission was found, store it for later use
            if (_.isObject(previousMission)) {
                that._previousCompletedMission = previousMission;
            }

            return next();
        });
    }
    else {
        return next();
    }
});

missionSchema.pre('save', function(next) {
    var that = this;
    that.populate('person', function(err) {
        if (err) {
            return next(err);
        }
        return that.person.notifyMissionCompleted(that, next);
    });
});

missionSchema.pre('save', function(next) {
    var that = this;
    var missionType = that.getType();

    // Missions should never be edited, throw an error if this is not a new mission
    // Careful: if this is removed, some tasks in the hook have to be modified (they should only happen once)
    if (!that.isNew) {
        return next(new Error('Missions cannot be edited (' + missionType + ', ' + that.id + ')'));
    }

    // Get the person of the mission
    that.populate('person', function(err) {
        if (err) {
            return next(err);
        }
        async.series([
            // Calculate the points for this mission
            function(cb) {
                // Check if it's an npc
                if (that.person.accountType === constants.ACCOUNT_TYPES.NPC) {
                    // No points for npcs
                    that.points = 0;
                    that.isNpcMission = true;
                    return cb();
                }

                // No NPC, calculate the points
                that.getCurrentPoints(function(err, points) {
                    if (err) {
                        return cb(err);
                    }
                    that.points = points;
                    return cb();
                });
            },

            // Populate the location to notify it of the new mission
            function(cb) {
                // TODO: should only populate if not already done?
                that.populate('location', function(err) {
                    if (err) {
                        return cb(err);
                    }
                    return that.location.notifyMissionCompleted(that, that._previousCompletedMission, cb);
                });
            },

            // Populate products to notify of completed missions (if product mission)
            function(cb) {
                // Check if this is a product modifying mission
                if (that.isProductModifyingMission()) {
                    that.populate('outcome.product', function(err) {
                        if (err) {
                            return cb(err);
                        }

                        // Tell the product about it
                        that.outcome.product.notifyProductModifyingMissionCompleted(that, cb);
                    });
                }
                else {
                    // Not a product mission, nothing to do
                    return cb();
                }
            }
        ], next);
    });
});

/**
 * Returns the mission model with the given identifier
 * (used by the frontend)
 *
 * @param {string} identifier
 * @returns {Mission}
 */
missionSchema.statics.getModelForIdentifier = function(identifier) {
    var MissionModel;
    if (typeof identifier === 'string' && identifier.length > 0) {
        var name = identifier.charAt(0).toUpperCase() +
            identifier.substr(1) + 'Mission';
        MissionModel = allMissions[name];
    }
    return MissionModel;
};

/**
 * Returns the identifier of this mission used by the frontend
 * @returns {string}
 */
missionSchema.statics.getIdentifier = function() {
    return getIdentifierForModelName(this.modelName);
};

/**
 * Returns the maximum number of points the given mission gives
 * @returns {number}
 */
missionSchema.statics.getMaxPoints = function() {
    return POINTS_BY_TYPE[this.modelName];
};

/**
 * Whether the mission's cool down period has passed
 * @returns {boolean}
 */
missionSchema.methods.isCooledDown = function() {
    return (Date.now() - this.completed.getTime()) > MISSION_COOL_DOWN_PERIOD[this.getType()];
};

/**
 * Returns whether the given mission model is a mission that acts on Products
 * @returns {boolean}
 * @private
 */
missionSchema.methods.isProductModifyingMission = function() {
    return (allMissions.productMissionModels.indexOf(this.constructor) >= 0);
};

/**
 * Calculates the points that should be awarded for this mission
 * at the current time. This depends on when the user last did this
 * mission at this location and the cool down period of the mission.
 * TODO: test this thoroughly
 * TODO: this needs to be merged somehow with the code in the Location controller that does the same calculation for many misions
 * @param {function} callback
 */
missionSchema.methods.getCurrentPoints = function(callback) {
    // If this mission gives 0 max points, return that immediately
    var maxPoints = this.constructor.getMaxPoints();
    if (maxPoints === 0) {
        return callback(null, 0);
    }

    // Put together the query to find out if the mission is cooled down and should give points
    var query = {
        person: this.person,
        location: this.location,
        completed: {
            $gt: Date.now() - MISSION_COOL_DOWN_PERIOD[this.constructor.modelName]
        },
        points: {
            $gt: 0
        }
    };

    // If it's a product mission, it also needs to be for the same product to be not cooled down
    if (this.isProductModifyingMission()) {
        query['outcome.product'] = this.outcome.product;
    }


    // Otherwise we have to query to see if there is a mission that is not cooled down yet
    this.constructor.find(query, function(err, count) {
        if (err) {
            return callback(err);
        }

        // Give max points if we didn't find any mission that is not cooled down
        var points = (count <= 0) ? maxPoints : 0;
        callback(null, points);
    });
};

/**
 * Returns the type of the mission
 * @returns {string}
 * TODO: this should be a static too
 */
missionSchema.methods.getType = function() {
    return this.constructor.modelName;
};

/**
 * toJSON transform method is automatically called when converting a mission
 * to JSON (as before sending it over the API)
 * @type {{transform: Function}}
 */
missionSchema.options.toJSON = {
    transform: function(doc, ret) {
        // Check if this is a sub document
        if (typeof doc.ownerDocument === 'function') {
            // TODO: how do I know which subdoc I'm working on?
            // Check if this subdoc has a product that is populated
            if (typeof ret.product === 'object') {
                // Depopulate it
                ret.product = ret.product.id;
            }

            // Don't expose the id of the sub document
            delete ret._id;
        }
        else {
            // Pick from the ret object, since subdocs and other models are already transformed
            var newRet = _.assign(_.pick(ret, ['completed', 'outcome', 'points', 'person', 'location']), {
                id: ret._id,
                type: doc.constructor.getIdentifier() // TODO: there should be a direct way to access the statics
            });

            return newRet;
        }

    }
};

/**
 * Returns the number of missions of the given type completed by non-npc players
 * at the given location
 * @param {string} missionType
 * @param {id} locationId
 * @param {function} callback Will be called with (err, count)
 */
missionSchema.methods.getNonNpcMissionCount = function(missionType, locationId, callback) {
    allMissions.Mission.count({
        __t: missionType,
        location: locationId,
        isNpcMission: false
    }, callback);
};

// Create Mission model
var Mission = mongoose.model('Mission', missionSchema);

// Object to hold all the missions that will be exported
allMissions.Mission = Mission;

// And all the discriminators (= specific missions)
allMissions.AddLocationMission = Mission.discriminator('AddLocationMission', new MissionSchema(
    {
        type: Boolean,
        required: true
    }
));


allMissions.VisitBonusMission = Mission.discriminator('VisitBonusMission', new MissionSchema(
    {
        type: Boolean,
        required: true
    }
));

allMissions.HasOptionsMission = Mission.discriminator('HasOptionsMission', new MissionSchema(
    {
        type: String,
        enum: ['no', 'ratherNo', 'noClue', 'ratherYes', 'yes'],
        required: true
    }
));

allMissions.WantVeganMission = Mission.discriminator('WantVeganMission', new MissionSchema(
    {
        type: [{
            expression: {
                type: String,
                required: true
            },
            expressionType: {
                type: String,
                required: true,
                enum: ['builtin', 'custom']
            }
        }],
        required: true
    }
));

allMissions.WhatOptionsMission = Mission.discriminator('WhatOptionsMission', new MissionSchema(
    {
        type: [{
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            }
        }],
        required: true
    }
));

allMissions.BuyOptionsMission = Mission.discriminator('BuyOptionsMission', new MissionSchema(
    {
        type: [{
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            }
        }],
        required: true
    }
));

allMissions.RateProductMission = Mission.discriminator('RateProductMission', new MissionSchema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        info: {
            type: Number,
            min: 1.0,
            max: 5.0,
            required: true
        }
    }
));

allMissions.SetProductNameMission = Mission.discriminator('SetProductNameMission', new MissionSchema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        info: {
            type: String,
            required: true
        }
    }
));

allMissions.SetProductAvailMission = Mission.discriminator('SetProductAvailMission', new MissionSchema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        info: {
            type: String,
            enum: constants.PRODUCT_AVAILABILITY_STRINGS,
            required: true
        }
    }
));

allMissions.GiveFeedbackMission = Mission.discriminator('GiveFeedbackMission', new MissionSchema(
    {
        type: String,
        required: true
    }
));

allMissions.OfferQualityMission = Mission.discriminator('OfferQualityMission', new MissionSchema(
    {
        type: Number,
        min: 1.0,
        max: 5.0,
        required: true
    }
));

allMissions.EffortValueMission = Mission.discriminator('EffortValueMission', new MissionSchema(
    {
        type: String,
        enum: ['no', 'ratherNo', 'ratherYes', 'yes'],
        required: true
    }
));

allMissions.LocationTagsMission = Mission.discriminator('LocationTagsMission', new MissionSchema(
    {
        type: [{
            type: String,
            enum: constants.LOCATION_TAGS,
            required: true
        }],
        required: true
    }
));

/**
 * List of missions that are specific to a location
 * @type {*[]}
 */
allMissions.locationMissionModels = [
    allMissions.VisitBonusMission,
    allMissions.HasOptionsMission,
    allMissions.WantVeganMission,
    allMissions.WhatOptionsMission,
    allMissions.BuyOptionsMission,
    allMissions.GiveFeedbackMission,
    allMissions.OfferQualityMission,
    allMissions.EffortValueMission,
    allMissions.LocationTagsMission
];

/**
 * List of mission that act on (modify) single products.
 * @type {*[]}
 */
allMissions.productMissionModels = [
    allMissions.RateProductMission,
    allMissions.SetProductNameMission,
    allMissions.SetProductAvailMission
];

module.exports = allMissions;
