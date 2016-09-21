/*jshint node: true*/
'use strict';

var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    watch = require('gulp-watch'),
    batch = require('gulp-batch'),
    filter = require('gulp-filter'),
    Q = require('q')
;

Q.longStackSupport = true;

// Caused: Error: write after end
//var filter_files = filter(['**', '!**/files/*']);  // prevent test files from executing by gulp as tests in themselves

gulp.task('mocha', function () {
  return gulp.src(['test/**/*.js'], { read: false })
  //.pipe(filter_files)
  .pipe(mocha({
    reporter: 'spec',
    globals: {
      should: require('should').noConflict()
    }
  }))
  .on('error', function (err) {
    console.log('in error:', err);
    this.emit('end');
  });
//  .on('end', done);
});

gulp.task('default', function () {
  watch([
    'gulpfile.js',
    'index.js',
    'lib/**/*.js',
    'test/**/*.js'
  ], {
    ignoreInitial: false,
    verbose: false,
    readDelay: 1500 // filter duplicate changed events from Brackets
  }, batch(function (events, done) {
    gulp.start('mocha', done);
  }));
});
