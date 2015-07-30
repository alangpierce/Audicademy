module.exports = {
    entry: "./src/android-main.js",
    output: {
        path: __dirname + "/build",
        filename: "audicademy-android-bundle.js"
    },
    module: {
        loaders: [
        ]
    }
};
