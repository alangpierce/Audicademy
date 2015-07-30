/* @flow */

var SAVED_CALLBACKS = {};

function callbackForId(callbackId: string) {
    return SAVED_CALLBACKS[callbackId];
}

function defineWrapperMethod(handlerName: string, methodName: string) {
    console.log("Defining wrapper " + handlerName + " method " + methodName);
    function randomId() {
        // http://stackoverflow.com/a/12502559/1154997
        return Math.random().toString(36).slice(2);
    }

    var fullName = handlerName + "." + methodName;
    if (!window[handlerName]) {
        window[handlerName] = {};
    }
    window[handlerName][methodName] = function() {
        var callArgs = Array.prototype.slice.call(arguments);
        return new Promise(function(resolve, reject) {
            var callbackId = randomId();
            SAVED_CALLBACKS[callbackId] = function(result) {
                resolve(result);
            };
            var argArray = callArgs.slice();
            argArray.push(callbackId);
            window.AndroidBridge.callFunc(fullName, JSON.stringify(argArray));
        });
    }
}

window.CallbackJavaScriptBridge_callbackForId = callbackForId;
window.CallbackJavaScriptBridge_defineWrapperMethod = defineWrapperMethod;
