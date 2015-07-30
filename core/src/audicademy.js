/* @flow */

var _ = require("underscore");
var topictree = require("./topictree.js");
var wordBlacklist = require("./word-blacklist.js");
var buttonManager = require("./button-manager.js");

function topLevel(speechInterface: SpeechInterface, buttonInterface: ButtonInterface) {
    function sleep(timeMs: number) {
        return new Promise(function(resolve, reject) {
            setTimeout(resolve, timeMs);
        });
    }

    function normalizeTitle(title: string) {
        var words = title.split(/\W+/);
        var result = "";
        var resultWords = _.map(words, function (word: string) {
            var lowerWord = word.toLowerCase();
            if (wordBlacklist.has(lowerWord)) {
                console.log("Ignoring word " + lowerWord);
                return null;
            } else {
                return lowerWord;
            }
        });
        // Ignore both nulls and empty strings.
        return _.compact(resultWords).join(" ");
    }

    buttonManager.init(buttonInterface);

    var topics = topictree.topics;
    var topicsById = _.object(_.pluck(topics, 'id'), topics);

    async function topLevel() {
        // HACK: Wait 3 seconds for things to init.
        await sleep(3000);
        await syncSpeech("Welcome to Khan Academy!");
        await presentTopic("x00000000");
    }

    async function syncSpeech(text: string) {
        var utteranceId = await speechInterface.speak(text);
        await speechInterface.waitForEndOfSpeech(utteranceId);
    }

    async function speakMenuAndWaitForInput(text: string, inputWords: Array<string>) {
        var grammarId = await speechInterface.prepareSpeechList(inputWords.join(","));
        await speechInterface.speak(text);
        await buttonManager.waitForButtonDown();
        await speechInterface.stopSpeaking();
        await speechInterface.startListening(grammarId);
        await buttonManager.waitForButtonUp();
        return await speechInterface.stopListening();
    }

    async function presentTopic(topicId: string) {
        var topic = topicsById[topicId];

        if (!topic) {
            await syncSpeech("You reached a non-topic.");
            return;
        }

        var childIds = _.pluck(topic.childData, 'id');
        var children = _.map(childIds, function(childId) {
            return topicsById[childId];
        });
        children = _.compact(children);

        var childTitles = _.pluck(children, 'title');
        var normalizedTitles = _.map(childTitles, function(s){return normalizeTitle(s);});

        var topicsByNormalizedTitle = _.object(normalizedTitles, children);

        var childTitlesWithNumbers = _.map(childTitles, function(title, i) {
            return "" + (i + 1) + ". " + title + ". ";
        });


        var textToSpeak = "You are at topic " + topic.title + ". " + childTitlesWithNumbers.join("");
        var options = _.compact(normalizedTitles);
        var answer = await speakMenuAndWaitForInput(textToSpeak, options);

        var answerTopic = topicsByNormalizedTitle[answer];

        await presentTopic(answerTopic.id);
    }

    topLevel().catch(function(error) {
        console.log("Error: " + error);
    });
}

module.exports = topLevel;