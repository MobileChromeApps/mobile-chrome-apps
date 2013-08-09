var xml_helpers = require('../util/xml-helpers'),
    path = require('path'),
    fs = require('fs');

function handleError(err, cb) {
    if(typeof cb == 'function') {
        return cb(err);
    }
    throw err;
}

// Java world big-up!
function generatePackageJsonFromPluginXml(plugin_path, cb) {
  var package_json = {};
  var pluginXml = xml_helpers.parseElementtreeSync(path.join(plugin_path, 'plugin.xml'));
  
  if(!pluginXml) return handleError(new Error('invalid plugin.xml document'), cb);

  var pluginElm = pluginXml.getroot();
  
  if(!pluginElm) return handleError(new Error('invalid plugin.xml document'), cb);
  
  // REQUIRED: name, version REQUIRED
  // OPTIONAL: description, license, keywords
  var name = pluginElm.attrib.id,
      version = pluginElm.attrib.version,
      description = pluginElm.findtext('description'),
      license = pluginElm.findtext('license'),
      keywords = pluginElm.findtext('keywords');

  if(!version) return handleError(new Error('`version` required'), cb)
  package_json.version = version;

  if(!name) return handleError(new Error('`name` is required'), cb)
  if(!name.match(/^\w+|-*$/)) {
      var e = new Error('`name` can only contain alphanumberic characters and -')
      return handleError(e, cb);
  }
  package_json.name = name.toLowerCase();

  if(description) package_json.description = description;
  if(license)     package_json.license     = license  
  if(keywords)    package_json.keywords    = keywords.split(',');

  // write package.json
  var package_json_path = path.resolve(plugin_path, 'package.json');
  fs.writeFileSync(package_json_path, JSON.stringify(package_json, null, 4), 'utf8');
  return package_json;
}

module.exports.generatePackageJsonFromPluginXml = generatePackageJsonFromPluginXml;
