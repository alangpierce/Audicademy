/* @flow */

// Run some side-effects to expose some global functions for the Android bridge.
require("./android-bridge-lib.js");
var audicademyTopLevel = require("../../../core/src/audicademy.js");

console.log("Ran android-main");

function runAudicademyTopLevel() {
    audicademyTopLevel(AudicademyInterface);
}

window.runAudicademyTopLevel = runAudicademyTopLevel;