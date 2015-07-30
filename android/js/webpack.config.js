module.exports = {
    entry: "./src/android-main.js",
    output: {
        path: __dirname + "/build",
        filename: "audicademy-android-bundle.js"
    },
    module: {
        loaders: [
            {   
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel?optional[]=runtime&stage=1'
            }   
        ]
    }
};
