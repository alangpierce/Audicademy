/* @flow */

var _ = require("underscore");
var topictree = require("./data/topictree.js");
var wordBlacklist = require("./data/word-blacklist.js");
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
    _.each(topics, function(topic) {
        topic.kind = "Topic";
    });

    var videos = topictree.videos;
    _.each(videos, function(video) {
        video.kind = "Video";
    });

    var topicsById = _.object(_.pluck(topics, 'id'), topics);
    var videosById = _.object(_.pluck(videos, 'id'), videos);

    async function topLevel() {
        // HACK: Wait 3 seconds for things to init.
        await sleep(3000);
        await syncSpeech("Welcome to Khan Academy!");
        //await presentTopic(topicsById["x00000000"]);
        await presentVideo(videosById["x978a47a3"]);
    }

    async function syncSpeech(text: string) {
        var utteranceId = await speechInterface.speak(text);
        await speechInterface.waitForEndOfSpeech(utteranceId);
    }

    /**
     * Returns null if the response didn't match anything.
     */
    async function speakMenuAndWaitForInput(text: string, inputWords: Array<string>) {
        var grammarId = await speechInterface.prepareSpeechList(inputWords.join(","));
        await speechInterface.speak(text);
        await buttonManager.waitForButtonDown();
        await speechInterface.stopSpeaking();
        await speechInterface.startListening(grammarId);
        await buttonManager.waitForButtonUp();
        return await speechInterface.stopListening();
    }

    async function presentTopic(topic) {
        var childIds = _.pluck(topic.childData, 'id');
        var children = _.map(topic.childData, function(childIdentifier) {
            if (childIdentifier.kind == "Topic") {
                return topicsById[childIdentifier.id];
            } else if (childIdentifier.kind == "Video") {
                return videosById[childIdentifier.id];
            } else {
                console.log("Ignoring identifier " + childIdentifier.kind + ", " + childIdentifier.id +
                    " because it is not a supported kind.");
            }
        });
        children = _.compact(children);

        var normalizedTitles = _.map(_.pluck(children, 'title'), normalizeTitle);

        var childrenByNormalizedTitle = _.object(normalizedTitles, children);

        var formattedTitles = _.map(children, function(child, i) {
            var result = "" + (i + 1) + ". ";
            if (child.kind == "Video") {
                result += "Video. ";
            }
            return result + child.title + ". ";
        });

        var textToSpeak = "You are at topic " + topic.title + ". " + formattedTitles.join("");
        var options = _.compact(normalizedTitles);

        var answer = null;

        while (true) {
            answer = await speakMenuAndWaitForInput(textToSpeak, options);
            if (answer == null) {
                await syncSpeech("Sorry, I didn't understand that.")
            } else {
                break;
            }
        }

        var answerChild = childrenByNormalizedTitle[answer];

        if (answerChild.kind == "Topic") {
            await presentTopic(answerChild);
        } else if (answerChild.kind == "Video") {
            await presentVideo(answerChild);
        } else {
            console.log("Unexpected child kind: " + answerChild.kind);
        }
    }

    async function presentVideo(video) {
        await speechInterface.playYoutubeVideo(video.youtubeId);
    }

    topLevel().catch(function(error) {
        console.log("Error: " + error);
    });
}

module.exports = topLevel;