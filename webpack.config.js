const webpack = require('webpack');
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');

let libraryName = 'range-slider';

let plugins = [
  new ExtractTextPlugin('range-slider.css')
], outputFile;

if (process.env.NODE_ENV === 'build') {
  plugins.push(new UglifyJsPlugin({minimize: true}));
  outputFile = libraryName + '.min.js';
} else {
  outputFile = libraryName + '.js';
}

const config = {
  entry: __dirname + '/src/range-slider.js',
  devtool: 'source-map',
  output: {
    path: __dirname + '/dist',
    filename: outputFile,
    library: 'rangeSlider',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components)/
      },
      {
        test: /(\.jsx|\.js)$/,
        loader: 'eslint-loader',
        exclude: /(node_modules|bower_components)/
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: ['css-loader', 'postcss-loader']
        })
      }
    ]
  },
  resolve: {
    modules: [path.resolve('./src')],
    extensions: ['.js', '.css']
  },
  plugins: plugins,
  devServer: {
    contentBase: [
      path.join(__dirname, 'dist'),
      path.join(__dirname, 'example')
    ],
    compress: true,
    disableHostCheck: true,
    port: 8000
  }
};

module.exports = config;
