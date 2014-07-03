var gulp = require("gulp");
var gutil = require("gulp-util");
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');

gulp.task('lint', function() {
  return gulp.src([
      'src/**/*.js',
      // 'tests/**/*.js',
    ])
    .pipe(jshint({}))  // Using .jshintrc file for configuration.
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', function() {
  return gulp.src(['tests/**/*.js'])
    .pipe(mocha({
      reporter: 'spec', //'nyan'
      ui: 'bdd',
    }))
    .on('error', function(err) {
      throw err; // Make sure failed tests cause gulp to exit non-zero
    });
});

gulp.task('watch', [], function() {
  gulp.watch([
      'src/**/*.js',
      'tests/**/*.js',
    ], ['lint', 'test']);
});

gulp.task('default', ['lint', 'test'], function() {
});
