#!/usr/bin/node

// Load required modules
var fs = require('fs');
var path = require('path');

// Use localize for internal localizations
var localize = new require('localize')(__dirname);
localize.throwOnMissingTranslation(false);
var translate = localize.translate;

// Defaults for ``xlocalize``
var defaultLang = "en";
var recurse = true;
var extensions = ['html', 'js'];
var outLangs = [];

// Load arguments
for(var i = 0; i < process.argv.length; i++) {
	switch(process.argv[i]) {
		case "-l":
			defaultLang = process.argv[i+1];
			break;
		case "-r":
			recurse = true;
			break;
		case "-R":
			recurse = false;
			break;
		case "-e":
			extensions = process.argv[i+1].split(",");
			break;
		case "-t":
			outLangs = process.argv[i+1].split(",");
			break;
		case "-h":
		case "--help":
			console.log("xlocalize USAGE:\n");
			console.log("-l\tSet the default language for the translations.json file(s) (default: en)");
			console.log("-r\tSet xlocalize to generate translations.json files recursively (default)");
			console.log("-R\tSet xlocalize to only generate a translations.json file for the current directory");
			console.log("-e\tSet the file extensions to include for translation (default: html,js)");
			console.log("-t\tSet the languages to translate to (comma separated)");
			console.log("-h\tShow this help message.");
			process.exit();
		default:
			break;
	}
}

// Set internal localize object to use the user's default language
localize.setLocale(defaultLang);

// ## The *mergeObjs* function
// is a helper function that clones the value of various object into a new one.
// This simplistic one is fast, but assumes no recursive objects to merge.
function mergeObjs() {
	var outObj = {};
	for(var i in arguments) {
		if(arguments[i] instanceof Object) {
			for(var j in arguments[i]) {
				// Does not check for collisions, newer object
				// definitions clobber old definitions
				outObj[j] = arguments[i][j];
			}
		}
	}
	return outObj;
}

// ## The *processDir* function
// generates a ``translations.json`` file for the current directory, but does
// not override the previous file -- only augments it
function processDir(dir) {
	// JSON object for the current directory
	var dirJSON = {};
	// Path where translations will go
	var translations = path.join(dir, "translations.json");
	// Check for pre-existing ``translations.json`` file
	if(path.existsSync(translations)) {
		var currJSON = JSON.parse(fs.readFileSync(translations, "utf8"));
		dirJSON = mergeObjs(dirJSON, currJSON);
	}
	
	// Build pattern matching for searchable files
	var extRegExpStr = "(";
	for(var i = 0; i < extensions.length; i++) {
		extRegExpStr += extensions[i];
		if(i < extensions.length-1) { extRegExpStr += "|"; }
		else { extRegExpStr += ")$"; }
	}
	var extRegExp = new RegExp(extRegExpStr);

	// Process files in the current directory
	var files = fs.readdirSync(dir);
	files.forEach(function(file) {
		if(extRegExp.test(file)) {
			processFile(path.join(dir, file), dirJSON);
		}
		if(recurse && fs.statSync(path.join(dir, file)).isDirectory()) {
			processDir(path.join(dir, file));
		}
	});

	// Output dirJSON to file
	fs.writeFileSync(translations, JSON.stringify(dirJSON, null, "	"), "utf8");
}

// ## The *processFile* function
// extracts all translatable pieces of a source file into the dirJSON object,
// unless already there.
function processFile(filename, dirJSON) {
	// Hacky, hacky RegExp parsing right now; replace with something better
	var fileContents = fs.readFileSync(filename, "utf8");
	var translatables = fileContents.match(/translate\s*\([^\),]*/);
	if(translatables) {
		for(var i = 0; i < translatables.length; i++) {
			if(/^translate\s*\(\s*['"](.*)['"]$/.test(translatables[i])) { // A string-looking thing
				if(!dirJSON[RegExp.$1]) { // Does not yet exist
					dirJSON[RegExp.$1] = {};
				}
				outLangs.forEach(function(lang) {
					if(!dirJSON[RegExp.$1][lang]) { // No translation, yet
						dirJSON[RegExp.$1][lang] = translate("MISSING TRANSLATION");
					}
				});
			} else {
				var translateMessage = translate("FOUND VARIABLE INPUT: $[1]", translatables[i]);
				dirJSON[translateMessage] = {};
				outLangs.forEach(function(lang) {
					dirJSON[translateMessage][lang] = translate("MISSING TRANSLATION");
				});
			}
		}
	}
}

// Get the ball rollin'
processDir(process.cwd());
