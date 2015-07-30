// Run some side-effects to expose some global functions for the Android bridge.
require("./android-bridge-lib.js");

function runAudicademyTopLevel() {
    ToastInterface.toast("Hello world!");
}

window.runAudicademyTopLevel = runAudicademyTopLevel;