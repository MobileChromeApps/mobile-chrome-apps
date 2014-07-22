var Q = require('q');

var fs = require('fs');
var et = require('elementtree');

module.exports = exports = function updateConfigXml() {
  return require('./get-manifest')('www')
  .then(function(manifest) {
    var manifestData = require('./parse-manifest')(manifest);
    return Q.ninvoke(fs, 'readFile', 'config.xml', {encoding: 'utf-8'})
    .then(function(configFileContent) {
      var jsescape = require('jsesc');
      function escapedValueOrDefault(value, defaultValue) {
        if (typeof value === 'undefined')
          return defaultValue;
        return jsescape(value);
      }

      var tree = et.parse(configFileContent);

      var widget = tree.getroot();
      if (widget.tag == 'widget') {
        widget.attrib.version = escapedValueOrDefault(manifest.version, '0.0.1');
        widget.attrib.id = escapedValueOrDefault(manifest.packageId, 'com.your.company.HelloWorld');
      }

      var name = tree.find('./name');
      if (name) name.text = escapedValueOrDefault(manifest.name, 'Your App Name');

      var description = tree.find('./description');
      if (description) description.text = escapedValueOrDefault(manifest.description, 'Plain text description of this app');

      var author = tree.find('./author');
      if (author) author.text = escapedValueOrDefault(manifest.author, 'Author name and email');

      var content = tree.find('./content');
      if (content) content.attrib.src = "plugins/org.chromium.bootstrap/chromeapp.html";

      var access;
      while ((access = widget.find('./access'))) {
        widget.remove(access);
      }
      manifestData.whitelist.forEach(function(pattern, index) {
        var tag = et.SubElement(widget, 'access');
        tag.attrib.origin = pattern;
      });

      var newConfigFileContent = et.tostring(tree.getroot(), {indent: 4});

      // Don't write out if nothing actually changed
      if (newConfigFileContent == configFileContent)
        return;

      console.log('## Updating config.xml from manifest.json');
      return Q.ninvoke(fs, 'writeFile', 'config.xml', newConfigFileContent, { encoding: 'utf-8' });
    });
  });
};
