var fs = require('fs'),
    path = require('path');
var doc_txt = path.join(__dirname, '..', 'doc', 'help.txt');

module.exports = function help() {
    return fs.readFileSync(doc_txt, 'utf-8');
};
