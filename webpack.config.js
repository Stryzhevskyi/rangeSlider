const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const path = require('path');
const packageJson = require('./package');

const libraryName = 'range-slider';
const isProduction = process.env.NODE_ENV === 'production';
const mode = isProduction ? 'production' : 'development';
const plugins = [
  new MiniCssExtractPlugin({
    filename: isProduction ? 'range-slider.min.css' : 'range-slider.css',
    chunkFilename: '[id].css'
  }),
  new webpack.DefinePlugin({
    'VERSION': JSON.stringify(packageJson.version)
  })
];

let outputFile = isProduction ? libraryName + '.min.js' : libraryName + '.js';

const config = {
  entry: path.join(__dirname, '/src/range-slider.js'),
  mode,
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: outputFile,
    library: 'rangeSlider',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        sourceMap: true
      }),
      new OptimizeCSSAssetsPlugin({})
    ]
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
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { sourceMap: true }
          }
        ]
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
