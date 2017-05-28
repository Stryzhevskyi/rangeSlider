module.exports = {
  parser: false,
  plugins: {
    'autoprefixer': {
      browsers: [
        'ie >= 9',
        'last 3 versions'
      ]
    },
    'cssnano': {}
  }
};
