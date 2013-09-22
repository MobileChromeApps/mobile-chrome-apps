var CryptoJS = require('org.chromium.common.CryptoJS-sha256');
require('org.chromium.common.CryptoJS-enc-base64-min'); // just need to make sure this runs

var hexToMPDecimalLookupTable = {
  0:'a', 1:'b', 2:'c', 3:'d',
  4:'e', 5:'f', 6:'g', 7:'h',
  8:'i', 9:'j', a:'k', b:'l',
  c:'m', d:'n', e:'o', f:'p',
};
exports.hexToMPDecimal = function(hex) {
  return Array.prototype.map.call(hex, function(c) { return hexToMPDecimalLookupTable[c]; }).join('');
}

exports.mapAppNameToAppId = function(name) {
  var idInHex = CryptoJS.SHA256(name).toString(CryptoJS.enc.Hex).slice(0,32).toLowerCase();
  var idInMPDecimal = exports.hexToMPDecimal(idInHex);
  return idInMPDecimal;
}

exports.mapAppKeyToAppId = function(key) {
  // See http://stackoverflow.com/questions/1882981/google-chrome-alphanumeric-hashes-to-identify-extensions/2050916#2050916
  return exports.mapAppNameToAppId(CryptoJS.enc.Base64.parse(key))
}
