/* @flow */

var _ = require("underscore");

// Run some side-effects to expose some global functions for the Android bridge.
require("./android-bridge-lib.js");
var audicademyTopLevel = require("../../../core/src/audicademy.js");

var buttonDownHandlers = [];
var buttonUpHandlers = [];

function runAudicademyTopLevel() {
    var buttonInterface = {
        registerButtonDownHandler: function(callback) {
            buttonDownHandlers.push(callback);
        },
        registerButtonUpHandler: function(callback) {
            buttonUpHandlers.push(callback);
        }
    };

    audicademyTopLevel(AudicademyInterface, buttonInterface);
}

window.runAudicademyTopLevel = runAudicademyTopLevel;

window.handleSpeakButtonDown = function () {
    _.each(buttonDownHandlers, function (handler) {
        handler();
    });
};
window.handleSpeakButtonUp = function () {
    _.each(buttonUpHandlers, function (handler) {
        handler();
    });
};