function topLevel(speechInterface) {
    function sleep(timeMs) {
        return new Promise(function(resolve, reject) {
            setTimeout(resolve, timeMs);
        });
    }

    async function countToThree() {
        for (var i = 1; i <= 3; i++) {
            await speechInterface.speak("" + i);
            await sleep(2000);
        }
    }

    countToThree().catch(function(error) {
        console.log("Error: " + error);
    });
}

module.exports = topLevel;