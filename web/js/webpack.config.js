module.exports = {
    entry: "./src/web-main.js",
    output: {
        path: __dirname + "/../build",
        filename: "audicademy-web-bundle.js"
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
