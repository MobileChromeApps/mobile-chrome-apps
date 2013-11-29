var ZIP = require("./zip");
var FS = require("fs");
var data = FS.readFileSync("zip.zip")
var reader = ZIP.Reader(data);
console.log(reader.toObject('utf-8'));
