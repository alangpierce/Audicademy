/* @flow */

var _ = require("underscore");
var topictree = require("./data/topictree.js");
var wordBlacklist = require("./data/word-blacklist.js");
var buttonManager = require("./button-manager.js");

function topLevel(speechInterface: SpeechInterface, buttonInterface: ButtonInterface) {
    async function topLevel() {
        // HACK: Wait 3 seconds for things to init.
        await sleep(3000);
        await syncSpeech("Welcome to Khan Academy!");
        //await presentTopic(topicsById["x00000000"]);
        //await presentVideo(videosById["x978a47a3"]);
        //await presentArticle(articlesById["x3d0bb45f"]);
        await presentSampleExercise();
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

    var ARTICLE_TEXT = "<p><span class=\"image-wrapper inline-image\"><img alt=\"Leonardo da Vinci, Mona Lisa, c. 1503-05, oil on panel 30-1/4 x 21 inches (Musée du Louvre) \" src=\"https://ka-perseus-images.s3.amazonaws.com/d564db881d02efb94414c3480b1b463584c47c60.jpg\" /><span class=\"image-caption\">Leonardo da Vinci, <em>Mona Lisa<\/em>, c. 1503-05, oil on panel 30-1/4 x 21 inches (Mus&eacute;e du Louvre) <\/span><\/span>We often hear about the importance of cultural heritage. But what is cultural heritage? And whose heritage is it? Whose national heritage, for example, does the <em>Mona Lisa<\/em> by Leonardo da Vinci belong to? Is it French or Italian?<\/p>\n\n<p>First of all, let&rsquo;s have a look at the meaning of the words. &ldquo;Heritage&rdquo; is a property, something that is inherited, passed down from previous generations. In the case of &ldquo;cultural heritage,&rdquo; the heritage doesn&rsquo;t consist of money or property, but of culture, values and traditions. Cultural heritage implies a shared bond, our belonging to a community. It represents our history and our identity; our bond to the past, to our present, and the future.&nbsp;<\/p>\n\n<h3>Tangible and Intangible Cultural Heritage<\/h3>\n\n<p>Cultural heritage often brings to mind artifacts (paintings, drawings, prints, mosaics, sculptures), historical monuments and buildings, as well as archaeological sites. But the concept of cultural heritage is even wider than that, and has gradually grown to include all evidence of human creativity and expression: photographs, documents, books and manuscripts, and instruments, etc. either as individual objects or as collections. Today, towns, underwater heritage, and the natural environment are also considered part of cultural heritage since communities identify themselves with the natural landscape.<\/p>\n\n<p>Moreover, cultural heritage is not only limited to material objects that we can see and touch. It also consists of immaterial elements: &nbsp;traditions, oral history, performing arts, social practices, traditional craftsmanship, representations, rituals, knowledge and skills transmitted from generation to generation within a community.<\/p>\n\n<p>Intangible heritage therefore includes a dizzying array of traditions, music and dances such as tango and flamenco, holy processions, carnivals, falconry, Viennese coffee house culture, the Azerbaijani carpet and its weaving traditions, Chinese shadow puppetry, the Mediterranean diet, Vedic Chanting, Kabuki theatre, the polyphonic singing of the Aka of Central Africa (to name a few examples).<\/p>\n\n<h3>The Importance of Protecting Cultural Heritage<\/h3>\n\n<p>But cultural heritage is not just a set of cultural objects or traditions from the past. It is also the result of a selection process: a process of memory and oblivion that characterizes every human society constantly engaged in choosing&mdash;for both cultural and political reasons&mdash;what is worthy of being preserved for future generations and what is not.<\/p>\n\n<p>All peoples make their contribution to the culture of the world. That&rsquo;s why it&rsquo;s important to respect and safeguard all cultural heritage, through national laws and international treaties. Illicit trafficking of artifacts and cultural objects, pillaging of archaeological sites, and destruction of historical buildings and monuments cause irreparable damage to the cultural heritage of a country. UNESCO (United Nations Educational, Scientific and Cultural Organization), founded in 1954, has adopted international conventions on the protection of cultural heritage, to foster intercultural understanding while stressing the importance of international cooperation.<\/p>\n\n<p>The protection of cultural property is an old problem. One of the most frequently recurring issues in protecting cultural heritage is the difficult relationship between the interests of the individual and the community, the balance between private and public rights.<\/p>\n\n<p>Ancient Romans established that a work of art could be considered part of the patrimony of the whole community, even if privately owned. For example, sculptures decorating the fa&ccedil;ade of a private building were recognized as having a common value and couldn&rsquo;t be removed, since they stood in a public site, where they could be seen by all citizens.<\/p>\n\n<p><span class=\"image-wrapper inline-image\"><img alt=\"Lysippos of Sikyon, Apoxyomenos (Scraper), Hellenistic or Roman copy after 4th c. Greek original, c. 390-306 B.C.E. (Museo Pio-Clementino, Vaticana)\" src=\"https://ka-perseus-images.s3.amazonaws.com/e44ec5296c034c189cfedfee36d6943b6c8edc27.jpg\" /><span class=\"image-caption\">Lysippos of Sikyon, <em>Apoxyomenos (Scraper)<\/em>, Hellenistic or Roman copy after 4th c. Greek original, c. 390-306 B.C.E. (Museo Pio-Clementino, Vaticana)<\/span><\/span>In his<em> Naturalis Historia<\/em> the Roman author Pliny the Elder (23-79 C.E.) reported that the statesman and general Agrippa placed the <em>Apoxyomenos<\/em>, a masterpiece by the very famous Greek sculptor Lysippos, in front of his thermal baths. The statue represented an athlete scraping dust, sweat and oil from his body with a particular instrument called &ldquo;strigil.&rdquo; Emperor Tiberius deeply admired the sculpture and ordered it be removed from public view and placed in his private palace. The Roman people rose up and obliged him to return the <em>Apoxyomenos<\/em> to its previous location, where everyone could admire it.<\/p>\n\n<p>Our right to enjoy the arts, and to participate in the cultural life of the community is included in the United Nation&rsquo;s 1948 <em>Universal Declaration of Human Rights<\/em>.<\/p>\n\n<h3>Whose Cultural Heritage?<\/h3>\n\n<p>The term &ldquo;cultural heritage&rdquo; typically conjures up the idea of a single society and the communication between its members. But cultural boundaries are not necessarily well-defined. Artists, writers, scientists, craftsmen and musicians learn from each other, even if they belong to different cultures, far removed in space or time. Just think about the influence of Japanese prints on Paul Gauguin&rsquo;s paintings; or of African masks on Pablo Picasso&rsquo;s works. Or you could also think of western architecture in Liberian homes in Africa. When the freed African-American slaves went back to their homeland, they built homes inspired by the neoclassical style of mansions on American plantations. American neoclassical style was in turn influenced by the Renaissance architect Andrea Palladio, who had been influenced by Roman and Greek architecture.<\/p>\n\n<p>Let&rsquo;s take another example, that of the <em>Mona Lisa<\/em> painted in the early sixteenth century by Leonardo da Vinci, and displayed at the Mus&eacute;e du Louvre in Paris. From a modern point of view, whose national heritage does the <em>Mona Lisa<\/em> belong to?<\/p>\n\n<p><span class=\"block-image image-wrapper\"><img alt=\"People taking photos of the Mona Lisa, photo: Heather Anne Campbell, (CC BY-NC-ND 2.0) &lt;https://www.flickr.com/photos/call-to-adventure/8159509811&gt;\" src=\"https://ka-perseus-images.s3.amazonaws.com/8721d35782ae907e21d9c5fff57106f421b13ce8.jpg\" /><span class=\"image-caption\">People taking photos of the Mona Lisa, photo: <a href=\"https://www.flickr.com/photos/call-to-adventure/8159509811\">Heather Anne Campbell<\/a>&nbsp;(CC BY-NC-ND 2.0)<\/span><\/span><\/p>\n\n<p>Leonardo was a very famous Italian painter, that&rsquo;s why the <em>Mona Lisa<\/em> is obviously part of the Italian cultural heritage. When Leonardo went to France, to work at King Francis I&rsquo;s court, he probably brought the <em>Mona Lisa<\/em> with him. It seems that in 1518 King Francis I acquired the <em>Mona Lisa<\/em>, which therefore ended up in the royal collections: that&rsquo;s why it is obviously part of the French national heritage, too. This painting has been defined as the best known, the most visited, the most written about and the most parodied work of art in the world: as such, it belongs to the cultural heritage of all mankind.<\/p>\n\n<p>Cultural heritage passed down to us from our parents must be preserved for the benefit of all. In an era of globalization, cultural heritage helps us to remember our cultural diversity, and its understanding develops mutual respect and renewed dialogue amongst different cultures.<\/p>\n\n<p>Essay by Elena Franchi<\/p>\n\n<hr />\n<p><strong>Additional resources:<\/strong><\/p>\n\n<p><a href=\"http://en.unesco.org/themes/protecting-our-heritage-and-fostering-creativity\">UNESCO<\/a><\/p>\n\n<p><a href=\"http://www.un.org/en/documents/udhr/\">The Universal Declaration of Human Rights<\/a><\/p>\n";

    async function speakArticle(controls) {
        var articleSentences = ARTICLE_TEXT
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

        var eventReceivers = [];
        var controls = {
            nextEvent: function() {
                return new Promise(function(resolve, reject) {
                    eventReceivers.push(resolve);
                });
            }
        };
        speakArticle(controls);

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

    async function presentSampleExercise() {
        var numCorrectLeft = 5;
        while (numCorrectLeft > 0) {
            await syncSpeech("" + numCorrectLeft + " problems left.");
            var result = await sampleProblem();
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
    async function sampleProblem() {
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

    topLevel().catch(function(error) {
        console.log("Error: " + error);
    });
}

module.exports = topLevel;