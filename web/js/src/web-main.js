var $ = require("jquery");
var _ = require("underscore");

var levenshtein = require('levenshtein-edit-distance');

var audicademyTopLevel = require("../../../core/src/audicademy.js");

function randomId() {
    // http://stackoverflow.com/a/12502559/1154997
    return Math.random().toString(36).slice(2);
}

var completedUtterances = {};
var utteranceCompletionCallbacks = {};

var grammars = {};
var activeGrammar = null;
var nextSpeechResultCallback = null;

var recognition = new webkitSpeechRecognition();

recognition.onresult = function(result) {
    var resultText = result.results[0][0].transcript;
    console.log("Got speech result " + resultText);
    if (nextSpeechResultCallback) {
        var grammar = grammars[activeGrammar];
        activeGrammar = null;

        var bestWord = null;
        var bestScore = Number.POSITIVE_INFINITY;
        _.each(grammar, function(word) {
            var score = levenshtein(word, resultText);
            if (score < bestScore) {
                bestScore = score;
                bestWord = word;
            }
        });
        console.log("Matched word " + bestWord);
        nextSpeechResultCallback(bestWord);
    }
};

recognition.onend = function() {
    if (nextSpeechResultCallback) {
        nextSpeechResultCallback(null);
    }
};


function runAudicademyTopLevel() {
    var speechInterface = {
        speak: function(text) {
            window.speechSynthesis.cancel();
            var msg = new SpeechSynthesisUtterance(text);
            var utteranceId = randomId();
            msg.onend = function() {
                if (utteranceCompletionCallbacks[utteranceId]) {
                    utteranceCompletionCallbacks[utteranceId]();
                } else {
                    completedUtterances[utteranceId] = true;
                }
            };
            window.speechSynthesis.speak(msg);
            return new Promise(function(resolve, reject) {
                resolve(utteranceId);
            });
        },
        waitForEndOfSpeech: function(utteranceId: string): Promise<void> {
            return new Promise(function(resolve, reject) {
                if (completedUtterances[utteranceId]) {
                    resolve();
                } else {
                    utteranceCompletionCallbacks[utteranceId] = resolve;
                }
            });
        },
        stopSpeaking(): Promise<void> {
            window.speechSynthesis.cancel();
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },

        playYoutubeVideo(youtubeId: string): Promise<string> {
            // Since autoplay is on, this will start playing immediately.
            var url = "http://fastly.kastatic.org/KA-youtube-converted/" + youtubeId + ".mp4/" + youtubeId + ".mp4";
            $("#audio_player").attr("src", url);
        },
        pauseYoutubeVideo(youtubeId: string): Promise<string> {
            $("#audio_player")[0].pause()
        },
        resumeYoutubeVideo(youtubeId: string): Promise<string> {
            $("#audio_player")[0].play()
        },

        prepareSpeechList: function(stringList: string): Promise<string> {
            var grammarId = randomId();
            grammars[grammarId] = stringList.split(",");
            return new Promise(function(resolve, reject) {
                resolve(grammarId);
            });
        },
        startListening: function(grammarId: string): Promise<void> {
            activeGrammar = grammarId;
            recognition.start();
        },
        stopListening: function(): Promise<string> {
            return new Promise(function(resolve, reject) {
                nextSpeechResultCallback = resolve;
                recognition.stop();
            });
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