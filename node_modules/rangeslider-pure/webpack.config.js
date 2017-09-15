const webpack = require('webpack');
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');

const libraryName = 'range-slider';

const plugins = [
  new ExtractTextPlugin('range-slider.css')
];

let outputFile;

if (process.env.NODE_ENV === 'build') {
  plugins.push(new UglifyJsPlugin({
    minimize: true,
    sourceMap: true
  }));

  outputFile = libraryName + '.min.js';
} else {
  outputFile = libraryName + '.js';
}

const config = {
  entry: path.join(__dirname, '/src/range-slider.js'),
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, '/dist'),
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
    host: '0.0.0.0',
    port: 8000
  }
};

module.exports = config;
