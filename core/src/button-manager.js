/* @flow */

var _ = require("underscore");

var buttonDownResolveFuncs = [];
var buttonUpResolveFuncs = [];

function init(buttonInterface: ButtonInterface) {
    buttonInterface.registerButtonDownHandler(function () {
        var resolveFuncs = buttonDownResolveFuncs;
        buttonDownResolveFuncs = [];
        _.each(resolveFuncs, function(func) {
            func();
        });
    });

    buttonInterface.registerButtonUpHandler(function () {
        var resolveFuncs = buttonUpResolveFuncs;
        buttonUpResolveFuncs = [];
        _.each(resolveFuncs, function (func) {
            func();
        });
    });
}

function waitForButtonDown(): Promise<void> {
    return new Promise(function(resolve, reject) {
        buttonDownResolveFuncs.push(resolve);
    });
}

function waitForButtonUp(): Promise<void> {
    return new Promise(function(resolve, reject) {
        buttonUpResolveFuncs.push(resolve);
    });
}

module.exports = {
    init: init,
    waitForButtonDown: waitForButtonDown,
    waitForButtonUp: waitForButtonUp
};