/**
 * Created by Serhei on 02.01.15.
 */
var gulp = require('gulp');
var del = require('del');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var jshint = require('gulp-jshint');
var watch = require('gulp-watch');

var dir = {
    src: {
        cssMin : 'rangeSlider.min.css',
        css: './src/*.css',
        js: './src/*.js'
    },
    dist: {
        jsMin : 'rangeSlider.min.js',
        css: './dist/',
        js: './dist/'
    }
};

gulp.task('clean', function (cb) {
    console.log('CLEAN');
    del(['dist/js/*'], cb);
});

gulp.task('js', function () {
    gulp
        .src(dir.src.js)
        .pipe(gulp.dest(dir.dist.js))
        .pipe(uglify())
        .pipe(rename(dir.dist.jsMin))
        .pipe(gulp.dest(dir.dist.js));
});

gulp.task('css', function () {
    gulp.src(dir.src.css)
        .pipe(gulp.dest(dir.dist.css))
        .pipe(minifyCSS())
        .pipe(rename(dir.src.cssMin))
        .pipe(gulp.dest(dir.dist.css));
});

gulp.task('jshint', function () {
    gulp.src(dir.src.js)
        .pipe(jshint({
            lookup: true
        }))
        .pipe(jshint.reporter('default'));
});

gulp.task('watch', function () {
    watch(dir.src.js, function () {
        gulp.start('js');
    });
    watch(dir.src.css, function () {
        gulp.start('css');
    });
});

gulp.task('build', ['js', 'css', 'jshint']);

gulp.task('default', [
    'js',
    'css',
    'watch'
]);
