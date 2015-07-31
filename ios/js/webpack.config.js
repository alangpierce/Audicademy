module.exports = {
    entry: "./src/ios-main.js",
    output: {
        path: __dirname + "/../AudicademyIos/build",
        filename: "audicademy-ios-bundle.js"
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
