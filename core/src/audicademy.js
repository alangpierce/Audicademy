/* @flow */

function topLevel(speechInterface: SpeechInterface) {
    function sleep(timeMs: number) {
        return new Promise(function(resolve, reject) {
            setTimeout(resolve, timeMs);
        });
    }

    async function countToThree() {
        // Hack: Wait for initialization to finish.
        await sleep(3000);
        while (true) {
            speechInterface.speak("Please say a number.");
            var result = await speechInterface.recognizeFromList("math,science,humanities");
            var utteranceId = await speechInterface.speak("You said " + result);
            await speechInterface.waitForEndOfSpeech(utteranceId);
        }
    }

    countToThree().catch(function(error) {
        console.log("Error: " + error);
    });
}

module.exports = topLevel;