var gulp = require("gulp");
var gutil = require("gulp-util");
var mocha = require('gulp-mocha');

var testFiles = [
  'tests/**/*.js'
];

gulp.task('test', function() {
  // Be sure to return the stream
  return gulp.src(testFiles)
    .pipe(mocha({
      reporter: 'spec', //'nyan'
      ui: 'bdd',
    }));
    /*
    .on('error', function(err) {
      // Make sure failed tests cause gulp to exit non-zero
      throw err;
    });*/
});

gulp.task('--help', function() {
  console.log('Usage:');
  console.log('  gulp test');
});

gulp.task('default', ['--help']);
