/* @flow */

var _ = require("underscore");
var topictree = require("./data/topictree.js");
var wordBlacklist = require("./data/word-blacklist.js");
var buttonManager = require("./button-manager.js");

function topLevel(speechInterface: SpeechInterface, contentInterface: ContentInterface, buttonInterface: ButtonInterface) {
    async function topLevel() {
        // HACK: Wait 3 seconds for things to init.
        await sleep(3000);
        await syncSpeech("Welcome to Khan Academy!");
        await presentTopic(topicsById["x00000000"]);
        //await presentTopic(topicsById["x20488a2b"]);
        //await presentVideo(videosById["878129397"]);
        //await presentArticle(articlesById["x64ef5293"]);
        //await presentSampleExercise();
    }

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
    var topicsById = _.object(_.pluck(topics, 'id'), topics);

    var videos = topictree.videos;
    _.each(videos, function(video) {
        video.kind = "Video";
    });
    var videosById = _.object(_.pluck(videos, 'id'), videos);

    var articles = topictree.articles;
    _.each(articles, function(article) {
        article.kind = "Article";
    });
    var articlesById = _.object(_.pluck(articles, 'id'), articles);

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
        await speechInterface.startListening(grammarId);
        await speechInterface.stopSpeaking();
        await buttonManager.waitForButtonUp();
        return await speechInterface.stopListening();
    }

    async function presentTopic(topic) {
        var children = _.map(topic.childData, function(childIdentifier) {
            if (childIdentifier.kind == "Topic") {
                return topicsById[childIdentifier.id];
            } else if (childIdentifier.kind == "Video") {
                return videosById[childIdentifier.id];
            } else if (childIdentifier.kind == "Article") {
                return articlesById[childIdentifier.id];
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
            } else if (child.kind == "Article") {
                result += "Article. ";
            }
            return result + child.title + ". ";
        });

        var textToSpeak = "You are at topic " + topic.title + ". " + formattedTitles.join("");
        var options = _.compact(normalizedTitles);
        options.push("back");
        options.push("simple exercise");
        options.push("advanced exercise");
        for (var i = 1; i <= children.length; i++) {
            options.push("" + i);
        }

        while (true) {
            var answer = null;

            answer = await speakMenuAndWaitForInput(textToSpeak, options);
            if (answer == null) {
                await syncSpeech("Sorry, I didn't understand that.");
                continue;
            } else if (answer == "back") {
                await syncSpeech("Going back.");
                break;
            } else if (answer == "simple exercise") {
                await presentSimpleExercise();
            } else if (answer == "advanced exercise") {
                await presentAdvancedExercise();
            } else {
                // Check if answer is a number, use that index if so.
                // Assume it's the actual title.
                var answerChild;
                if (parseInt(answer) == answer) {
                    var answerIndex = parseInt(answer) - 1;
                    answerChild = children[answerIndex];
                } else {
                    answerChild = childrenByNormalizedTitle[answer];
                }

                if (answerChild.kind == "Topic") {
                    await presentTopic(answerChild);
                } else if (answerChild.kind == "Video") {
                    await presentVideo(answerChild);
                } else if (answerChild.kind == "Article") {
                    await presentArticle(answerChild);
                } else {
                    console.log("Unexpected child kind: " + answerChild.kind);
                }
            }
        }
    }

    async function presentVideo(video) {
        var activeGrammarId = await speechInterface.prepareSpeechList("pause,back");
        var pausedGrammarId = await speechInterface.prepareSpeechList("resume,back");
        await syncSpeech("Playing video " + video.title);
        await speechInterface.playYoutubeVideo(video.youtubeId);

        var isPaused = false;
        while (true) {
            if (isPaused) {
                await buttonManager.waitForButtonDown();
                await speechInterface.startListening(pausedGrammarId);
                await buttonManager.waitForButtonUp();
                var pausedResult = await speechInterface.stopListening();
                if (pausedResult == "resume") {
                    await speechInterface.resumeYoutubeVideo();
                    isPaused = false;
                } else if (pausedResult == "back") {
                    await syncSpeech("Going back.");
                    return;
                } else {
                    await syncSpeech("Sorry, I didn't understand that.");
                }
            } else {
                await buttonManager.waitForButtonDown();
                await speechInterface.pauseYoutubeVideo();
                await speechInterface.startListening(activeGrammarId);
                await buttonManager.waitForButtonUp();
                var activeResult = await speechInterface.stopListening();
                if (activeResult == "pause") {
                    await syncSpeech("Pausing.");
                    isPaused = true;
                } else if (activeResult == "back") {
                    await syncSpeech("Going back.");
                    return;
                } else {
                    await syncSpeech("Sorry, I didn't understand that.");
                    await speechInterface.resumeYoutubeVideo();
                }
            }
        }
    }

    async function speakArticle(articleText: string, controls) {
        var articleSentences = articleText
            .replace(/<[^>]*>/g, " ")
            .replace(/&ldquo;/g, "'")
            .replace(/&rdquo;/g, "'")
            .replace(/&rsquo;/g, "'")
            .replace(/&lsquo;/g, "'")
            .replace(/&nbsp;/g, " ")
            .replace(/&mdash;/g, " - ")
            .split(".");
        for (var i = 0; i < articleSentences.length; i++) {
            var utteranceId = await speechInterface.speak(articleSentences[i]);
            var speechPromise = speechInterface.waitForEndOfSpeech(utteranceId);
            var controlPromise = controls.nextEvent();
            var result = await Promise.race([speechPromise, controlPromise]);
            if (result != null && result.kind == "controlEvent") {
                if (result.value == "pause") {
                    await speechInterface.stopSpeaking();
                    await waitForArticleResume(controls);
                    // Step back to the last sentence instead of skipping the current one.
                    i--;
                }
            }
        }
    }

    async function waitForArticleResume(controls) {
        while (true) {
            var result = await controls.nextEvent();
            if (result.kind == "controlEvent" && result.value == "resume") {
                return;
            }
        }
    }

    async function presentArticle(article) {
        var activeGrammarId = await speechInterface.prepareSpeechList("pause,back");
        var pausedGrammarId = await speechInterface.prepareSpeechList("resume,back");
        await syncSpeech("Playing article " + article.title);

        var articleText = await contentInterface.loadArticle(article.id);

        var eventReceivers = [];
        var controls = {
            nextEvent: function() {
                return new Promise(function(resolve, reject) {
                    eventReceivers.push(resolve);
                });
            }
        };
        speakArticle(articleText, controls);

        function sendEvent(eventName: string) {
            var receivers = eventReceivers;
            eventReceivers = [];
            _.each(receivers, function(receiver) {
                receiver({
                    kind: "controlEvent",
                    value: eventName
                });
            });
        }

        var isPaused = false;
        while (true) {
            if (isPaused) {
                await buttonManager.waitForButtonDown();
                await speechInterface.startListening(pausedGrammarId);
                await buttonManager.waitForButtonUp();
                var pausedResult = await speechInterface.stopListening();
                if (pausedResult == "resume") {
                    sendEvent("resume");
                    isPaused = false;
                } else if (pausedResult == "back") {
                    await syncSpeech("Going back.");
                    return;
                } else {
                    await syncSpeech("Sorry, I didn't understand that.");
                }
            } else {
                await buttonManager.waitForButtonDown();
                sendEvent("pause");
                await speechInterface.startListening(activeGrammarId);
                await buttonManager.waitForButtonUp();
                var activeResult = await speechInterface.stopListening();
                if (activeResult == "pause") {
                    await syncSpeech("Pausing.");
                    isPaused = true;
                } else if (activeResult == "back") {
                    await syncSpeech("Going back.");
                    return;
                } else {
                    await syncSpeech("Sorry, I didn't understand that.");
                    sendEvent("resume");
                }
            }
        }
    }

    async function presentSimpleExercise() {
        await syncSpeech("Starting the simple exercise.");
        var numCorrectLeft = 5;
        while (numCorrectLeft > 0) {
            await syncSpeech("" + numCorrectLeft + " problems left.");
            var result = await simpleProblem();
            if (result == "back") {
                return;
            } else if (result == "correct") {
                numCorrectLeft--;
            } else {
                numCorrectLeft = 5;
            }
        }
        await syncSpeech("Congratulations, you got five in a row!");
    }

    // Returns "back", "correct", or "incorrect".
    async function simpleProblem() {
        var value1 = Math.floor(Math.random() * 8 + 2);
        var value2 = Math.floor(Math.random() * 8 + 2);

        var question = "What is " + value1 + " plus " + value2 + "?";
        var choices = _.range(0, 21);
        choices.push("back");
        while (true) {
            var result = await speakMenuAndWaitForInput(question, choices);
            if (result == null) {
                syncSpeech("Sorry, I didn't understand that.");
                continue;
            }
            if (result == "back") {
                syncSpeech("Going back.");
                return "back";
            }
            await syncSpeech("Checking answer " + result);
            var buttonPromise = buttonManager.waitForButtonDown().then(function(){ return "pressed"; });
            var sleepPromise = sleep(1500);
            var pauseResult = await Promise.race([sleepPromise, buttonPromise]);
            if (pauseResult == "pressed") {
                await buttonManager.waitForButtonUp();
                await syncSpeech("Ok, I'll forget about that answer.");
                continue;
            }

            if (parseInt(result) == value1 + value2) {
                await syncSpeech("" + result + " is correct!");
                return "correct";
            } else {
                await syncSpeech("Sorry, " + result + " is incorrect.");
                return "incorrect";
            }
        }
    }

    async function presentAdvancedExercise() {
        await syncSpeech("Starting the advanced exercise.");

        var options = ["back", "repeat the question", "i have an answer"];
        for (var i = 1; i <= 10; i++) {
            options.push("record note " + i);
            options.push("play note " + i);
        }

        var grammarId = await speechInterface.prepareSpeechList(options.join(","));

        var problemText = 'Find all solutions to the following equation. x squared plus five x minus 2 equals 2 x ' +
            'squared minus 5. Say your answer like "one plus or minus the square root of two over three". When you ' +
            'have an answer, say "I have an answer".';

        // x^2 + 5x - 2 = 2x^2 - 5
        await syncSpeech(problemText);

        var noteIds = {};

        while (true) {
            // Answer: x = (5 \pm sqrt(13)) / (4)
            await buttonManager.waitForButtonDown();
            await speechInterface.startListening(grammarId);
            await speechInterface.stopSpeaking();
            await buttonManager.waitForButtonUp();
            var answer = await speechInterface.stopListening();

            if (answer == null) {
                await syncSpeech("Sorry, I didn't understand that.");
            } else if (answer == "back") {
                await syncSpeech("Going back.");
                return;
            } else if (answer == "repeat the question") {
                await syncSpeech(problemText);
            } else if (answer.startsWith("record note")) {
                var noteNumStr = answer.split(" ")[2];
                speechInterface.speak("Recording note " + noteNumStr + ".");
                await buttonManager.waitForButtonDown();
                var noteId = await speechInterface.recordUserVoice();
                await buttonManager.waitForButtonUp();
                speechInterface.stopRecordingUserVoice();
                noteIds[noteNumStr] = noteId;
                await syncSpeech("Saved.");
            } else if (answer.startsWith("play note")) {
                var noteNumStr = answer.split(" ")[2];
                if (noteIds[noteNumStr]) {
                    speechInterface.playBackUserVoice(noteIds[noteNumStr]);
                } else {
                    await syncSpeech("I don't have anything for note " + noteNumStr + ".");
                }
            } else if (answer == "i have an answer") {
                await syncSpeech("Ok, what is your answer?");
                await buttonManager.waitForButtonDown();
                await speechInterface.startListening("quadratic_formula_grammar");
                await speechInterface.stopSpeaking();
                await buttonManager.waitForButtonUp();
                var finalAnswer = await speechInterface.stopListening();
                await syncSpeech("Your answer was " + finalAnswer);

                if (finalAnswer == "5 plus or minus the square root of 13 over 4") {
                    await syncSpeech("Good job, that answer is correct.");
                } else {
                    await syncSpeech("That answer is incorrect.");
                }
            }
        }
    }

    topLevel().catch(function(error) {
        console.log("Error: " + error);
    });
}

module.exports = topLevel;