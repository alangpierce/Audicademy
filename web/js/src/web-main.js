var $ = require("jquery");
var audicademyTopLevel = require("../../../core/src/audicademy.js");

function randomId() {
    // http://stackoverflow.com/a/12502559/1154997
    return Math.random().toString(36).slice(2);
}

var COMPLETED_UTTERANCES = {};
var UTTERANCE_COMPLETION_CALLBACKS = {};

function runAudicademyTopLevel() {
    var speechInterface = {
        speak: function(text) {
            window.speechSynthesis.cancel();
            var msg = new SpeechSynthesisUtterance(text);
            var utteranceId = randomId();
            msg.onend = function() {
                if (UTTERANCE_COMPLETION_CALLBACKS[utteranceId]) {
                    UTTERANCE_COMPLETION_CALLBACKS[utteranceId]();
                } else {
                    COMPLETED_UTTERANCES[utteranceId] = true;
                }
            };
            window.speechSynthesis.speak(msg);
            return new Promise(function(resolve, reject) {
                resolve(utteranceId);
            });
        },
        waitForEndOfSpeech: function(utteranceId: string): Promise<void> {
            return new Promise(function(resolve, reject) {
                if (COMPLETED_UTTERANCES[utteranceId]) {
                    resolve();
                } else {
                    UTTERANCE_COMPLETION_CALLBACKS[utteranceId] = resolve;
                }
            });
        },
        stopSpeaking(): Promise<void> {
            window.speechSynthesis.cancel();
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },

        prepareSpeechList: function(stringList: string): Promise<string> {
            // TODO
        },
        startListening: function(grammarId: string): Promise<void> {
            // TODO
        },
        stopListening: function(): Promise<string> {
            // TODO
        }
    };
    var contentInterface = {

    };
    var buttonInterface = {
        registerButtonDownHandler: function(handler) {
            $("#speak_button").mousedown(handler);
        },
        registerButtonUpHandler: function(handler) {
            $("#speak_button").mouseup(handler);
        }
    };
    audicademyTopLevel(speechInterface, contentInterface, buttonInterface);
}

runAudicademyTopLevel();