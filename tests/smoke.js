var path = require('path');
var chai = require('chai');

var should = chai.should;
var expect = chai.expect;
var assert = chai.assert;

describe('Quick Smoke Tests', function() {
  describe('require', function() {

    it('cca directory', function() {
      expect(require('..')).to.not.be.null;
    });

    it('modules', function(done) {
      var srcDir = path.join(__dirname, '..', 'src');
      require('walk')
        .walk(srcDir, {
          followLinks: false,
          filters: []
        })
        .on('file', function (root, fileStats, next) {
          var modulePath = path.relative(srcDir, path.join(root, fileStats.name));
          expect(require(path.join(root, fileStats.name))).to.not.be.null;
          next();
        })
        .on('errors', function (root, nodeStatsArray, next) {
          console.error(arguments);
          next();
        })
        .on('end', function () {
          done();
        });
    });

  });
});
