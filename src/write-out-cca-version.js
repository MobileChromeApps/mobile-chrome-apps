var fs = require('fs');
var path = require('path');
var Q = require('q');

module.exports = exports = function writeOutCcaVersion() {
  var packageVersion = require('../package').version;
  if (!fs.existsSync(path.join('platforms'))) {
    return Q.reject('Must have a platforms/ directory to write out the cca version used to add them.');
  }
  return Q.ninvoke(fs, 'writeFile', path.join('platforms', 'created-with-cca-version'), packageVersion, { encoding: 'utf-8' });
};
