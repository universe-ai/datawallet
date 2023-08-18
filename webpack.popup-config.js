const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    node: {
        global: true
    },
    mode: "production",
    entry: "./src/extension/popup/popup.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "popup.js",
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "popup.css"
        }),
    ], 
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: 'css-loader', options: { importLoaders: 1 } },
                    //{ loader: 'resolve-url-loader' },
                    { loader: 'postcss-loader', options: { sourceMap: true } },
                ],
            },
            {
                test: /\.riot$/,
                exclude: /node_modules/,
                use: [{
                    loader: "@riotjs/webpack-loader",
                    options: {
                        hot: false, // set it to true if you are using hmr
                        // add here all the other @riotjs/compiler options riot.js.org/compiler
                        // template: 'pug' for example
                        scopedCss: true
                    }
                }]
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
                type: "asset/resource",
            },
        ],
    },
    resolve: {
        fallback: {
        }
    }
};
