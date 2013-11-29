// # Localize
// is a GNU gettext-inspired (but not conformant) localization library for
// Node.js

// Libraries, if in a CommonJS environment
if(typeof(require) != 'undefined') {
	var path = require('path');
	var fs = require('fs');
}

function Localize(translations, dateFormats, defaultLocale) {

	// Make sure the defaultLocale is something sane, and set the locale to
	// its value. Also configure ``Localize`` to throw an error if missing
	// a translation.
	defaultLocale = typeof(defaultLocale) == "string" ? defaultLocale : "en";
	var locale = defaultLocale;
	var missingTranslationThrow = true;
	
	// ## The *mergeObjs* function
	// is a simple helper function to create a new object based on input objects.
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
	
	// ## The *setLocale* function
	// simply sets the locale to whatever is specified at the moment, as long as it
	// is a string.
	this.setLocale = function(newLocale) {
		if(typeof(newLocale) == "string") {
			locale = newLocale;
		} else {
			throw new Error("Locale must be a string");
		}
	};

	// ## The *strings* object
	// contains a series of key-val pairs to be used for translating very large strings
	// that aren't desirable to have duplicated in several locations
	this.strings = {};
	
	// ## The *getTranslations* function
	// is a recursive function that checks the specified directory, and all child
	// directories, for ``translations.json`` files, combines them into one JSON
	// object, and returns them.
	function getTranslations(currDir, translations, strings) {
		if(path.existsSync(currDir)) {
			// Load translations.json file in current directory, if any
			if(path.existsSync(path.join(currDir, "translations.json"))) {
				translations = mergeObjs(translations,
					JSON.parse(fs.readFileSync(path.join(path.resolve(currDir), "translations.json")))
				);
			}
			// Load large text translations in translations subdirectory, if it exists
			var translationPath = path.join(currDir, "translations");
			if(path.existsSync(translationPath) && fs.statSync(translationPath).isDirectory()) {
				// Get all children in the translations directory
				var pathChildren = fs.readdirSync(translationPath);
				// Filter out all non-default translations (the ones without a lang type)
				pathChildren.filter(function(child) {
					return !/^.*\..*\..*/.test(child);
				// And map these default translations into an object containing the variable name to use,
				// the default text, and an array of translations for this text
				}).map(function(child) {
					return {
						name: child.replace(/\..*$/, ""),
						defaultText: fs.readFileSync(path.join(translationPath, child), 'utf8'),
						// To make the array of translations for this default translation, filter out
						// all files that do not start with the primary translation filename (minus extension), with a special
						// case to filter out the primary translation, as well
						translations: pathChildren.filter(function(secondChild) {
							return (new RegExp("^" + child.replace(/\..*$/, ""))).test(secondChild) && child != secondChild;
						// Then map this array of files into an object containing the language specified
						// and the translation text for this language
						}).map(function(secondChild) {
							return {
								lang: secondChild.replace(/\.[^\.]*$/, "").replace(/^[^\.]*\./, ""),
								text: fs.readFileSync(path.join(translationPath, secondChild), 'utf8')
							}
						})
					}
				// For each of these long-form translation objects, add the default text to the strings object using the
				// desired variable name, and create a translation object for all defined languages for this text.
				}).forEach(function(translation) {
					strings[translation.name] = translation.defaultText;
					translations[translation.defaultText] = {};
					translation.translations.forEach(function(lang) {
						translations[translation.defaultText][lang.lang] = lang.text;
					});
				});
			}
			// Recurse down each directory and get the translations for that directory
			var pathChildren = fs.readdirSync(currDir);
			for(var child in pathChildren) {
				var childPath = path.resolve(path.join(currDir, pathChildren[child]));
				if(fs.statSync(childPath).isDirectory()) {
					var tempArray = getTranslations(childPath, translations, strings);
					translations = tempArray[0], strings = tempArray[1];
				}
			}
		} else {
			throw new Error("Translation Path Invalid");
		}
		return [translations, strings];
	}
	
	// ## The *validateTranslations* function
	// determines whether or not the provided JSON object is in a valid
	// format for ``localize``.
	function validateTranslations(newTranslations) {
		if(typeof(newTranslations) != "object") { return false; }
		for(var translation in newTranslations) {
			if(typeof(translation) != "string") { return false; }
			if(typeof(newTranslations[translation]) != "object" ) { return false; }
			for(var lang in newTranslations[translation]) {
				if(typeof(lang) != "string") { return false; }
				if(typeof(newTranslations[translation][lang]) != "string") { return false; }
			}
		}
		return true;
	}
	
	// ## The *loadTranslations* function
	// takes a string or object, and attempts to append the specified translation
	// to its store of translations, either by loading all translations from the
	// specified directory (string), or appending the object directly.
	this.loadTranslations = function(newTranslations) {
		if(typeof(newTranslations) == "string") {
			var tempArray = getTranslations(newTranslations, {}, this.strings);
			newTranslations = tempArray[0];
			this.strings = tempArray[1];
		}
		if(validateTranslations(newTranslations)) {
			translations = mergeObjs(translations, newTranslations);
		} else {
			throw new Error("Must provide a valid set of translations.");
		}
	};
	
	// Now that we have the infrastructure in place, let's verify that the
	// provided translations are valid.
	this.loadTranslations(translations);
	
	// ## The *clearTranslations* function
	// simply resets the translations variable to a clean slate.
	this.clearTranslations = function() {
		translations = {};
	};

	// ## The *getTranslations* function
	// simply returns the entire translations object, or returns that portion
	// of translations matched by the elements of a provided array of text to
	// translate
	this.getTranslations = function(textArr) {
		if(textArr instanceof Array) {
			var outObj = {};
			textArr.forEach(function(text) {
				outObj[text] = translations[text];
			});
			return outObj;
		} else {
			return translations;
		}
	};

	// ## The *throwOnMissingTranslation* function
	// lets the user decide if a missing translation should cause an Error
	// to be thrown. Turning it off for development and on for testing is
	// recommended. The function coerces whatever it receives into a bool.
	this.throwOnMissingTranslation = function(shouldThrow) {
		missingTranslationThrow = !!shouldThrow;
	};
	
	// ## The *buildString* function
	// is a string-building function inspired by both ``sprintf`` and
	// [jQuery Templates](http://api.jquery.com/category/plugins/templates/)
	// and a small helping of RegExp. The first argument to buildString is
	// the source string, which has special ``$[x]`` blocks, where ``x`` is
	// a number from 1 to Infinity, matching the nth argument provided.
	// Because of ``.toString()``, string formatting _a la_ ``sprintf`` is
	// avoided, and the numeric identification allows the same parameter to
	// be used multiple times, and the parameter order need not match the
	// string referencing order (important for translations)
	function buildString() {
		var outString = arguments[0];
		for(var i = 1; i < arguments.length; i++) {
			outString = outString.replace(new RegExp("\\$\\[" + i + "\\]", "g"), arguments[i]);
		}
		return outString;
	}
	
	// ## The *translate* function
	// is a thin automatic substitution wrapper around ``buildString``. In
	// fact, it short-circuits to ``buildString`` when ``locale`` equals
	// ``defaultLocale``. Otherwise, it looks up the required translated
	// string and executes ``buildString`` on that, instead
	this.translate = function() {
		if(locale == defaultLocale) {
			return buildString.apply(this, arguments);
		}
		var newText = translations[arguments[0]] && translations[arguments[0]][locale] ?
			translations[arguments[0]][locale] : null;
		if(missingTranslationThrow && typeof(newText) != "string") {
			throw new Error("Could not find translation for '" +
				arguments[0] + "' in the " + locale + " locale");
		} else if(typeof(newText) != "string") {
			newText = arguments[0];
		}
		var newArr = Array.prototype.splice.call(arguments, 1, arguments.length - 1);
		newArr.unshift(newText);
		return buildString.apply(this, newArr);
	};

	// ## The *validateDateFormats* function
	// determines whether or not the provided dateFormat object conforms to
	// the necessary structure
	function validateDateFormats(dateFormats) {
		if(typeof(dateFormats) != "object") { return false; }
		for(var lang in dateFormats) {
			if(typeof(lang) != "string") { return false; }
			if(typeof(dateFormats[lang]) != "object") { return false; }
			if(!(dateFormats[lang].dayNames instanceof Array)) { return false; }
			if(!(dateFormats[lang].monthNames instanceof Array)) { return false; }
			if(typeof(dateFormats[lang].masks) != "object") { return false; }
			if(typeof(dateFormats[lang].masks["default"]) != "string") { return false; }
			if(dateFormats[lang].dayNames.length != 14) { return false; }
			if(dateFormats[lang].monthNames.length != 24) { return false; }
			for(var i = 0; i < 24; i++) {
				if(i < 14 && typeof(dateFormats[lang].dayNames[i]) != "string") { return false; }
				if(typeof(dateFormats[lang].monthNames[i]) != "string") { return false; }
			}
		}
		return true;
	}
	
	// ## The *loadDateFormats* function
	// appends the provided ``dateFormats`` object, if valid, to the current
	// ``dateFormats`` object. Otherwise, it throws an error.
	this.loadDateFormats = function(newDateFormats) {
		if(validateDateFormats(newDateFormats)) {
			dateFormats = mergeObjs(dateFormats, newDateFormats);
		} else {
			throw new Error("Invalid Date Format provided");
		}
	};

	// ## The *clearDateFormats* function
	// resets the ``dateFormats`` object to English dates.
	this.clearDateFormats = function() {
		dateFormats = {
			"en": {
				dayNames: [
					"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
					"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
				],
				monthNames: [
					"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
					"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
				],
				masks: {
					"default":      "ddd mmm dd yyyy HH:MM:ss",
					shortDate:      "m/d/yy",
					mediumDate:     "mmm d, yyyy",
					longDate:       "mmmm d, yyyy",
					fullDate:       "dddd, mmmm d, yyyy",
					shortTime:      "h:MM TT",
					mediumTime:     "h:MM:ss TT",
					longTime:       "h:MM:ss TT Z",
					isoDate:        "yyyy-mm-dd",
					isoTime:        "HH:MM:ss",
					isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
					isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
				}
			}
		};
	};

	// ## The *getDateFormats* function
	// returns the currently-defined ``dateFormats`` object
	this.getDateFormats = function() {
		return dateFormats;
	};
	
	// Now that we have the infrastructure in place, let's validate the
	// optional ``dateFormats`` object if provided, or initialize it.
	if(validateDateFormats(dateFormats)) {
		this.loadDateFormats(dateFormats);
	} else {
		this.clearDateFormats();
	}
	
	// The *localDate* function
	// provides easy-to-use date localization support. Based heavily on
	// [node-dateFormat](https://github.com/felixge/node-dateformat) by
	// Steven Levithan <stevenlevithan.com>
	// Scott Trenda <scott.trenda.net>
	// Kris Kowal <cixar.com/~kris.kowal/>
	// Felix Geisendörfer <debuggable.com>
	// MIT Licensed, as with this library. The resultant API is one where
	// a date string or object is the first argument, a mask string (being
	// either a key in the ``masks`` object or an arbitrary mask is the
	// second argument, and a third is a bool flag on whether local or UTC
	// time should be used.
	this.localDate = function() {
		var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
			timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
			timezoneClip = /[^-+\dA-Z]/g,
			pad = function (val, len) {
				val = String(val);
				len = len || 2;
				while (val.length < len) val = "0" + val;
				return val;
			};
		
		// Regexes and supporting functions are cached through closure
		return function (date, mask, utc) {
			// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
			if (arguments.length == 1 &&
				Object.prototype.toString.call(date) == "[object String]" &&
				!/\d/.test(date)) {
				mask = date;
				date = undefined;
			}
			
			date = date || new Date;
			
			if(!(date instanceof Date)) {
				date = new Date(date);
			}
			
			if(isNaN(date)) {
				throw TypeError("Invalid date");
			}
			
			mask = String(dateFormats[locale].masks[mask] || mask || dateFormats[locale].masks["default"]);
			
			// Allow setting the utc argument via the mask
			if (mask.slice(0, 4) == "UTC:") {
				mask = mask.slice(4);
				utc = true;
			}
			
			var	_ = utc ? "getUTC" : "get",
				d = date[_ + "Date"](),
				D = date[_ + "Day"](),
				m = date[_ + "Month"](),
				y = date[_ + "FullYear"](),
				H = date[_ + "Hours"](),
				M = date[_ + "Minutes"](),
				s = date[_ + "Seconds"](),
				L = date[_ + "Milliseconds"](),
				o = utc ? 0 : date.getTimezoneOffset(),
				flags = {
					d:    d,
					dd:   pad(d),
					ddd:  dateFormats[locale].dayNames[D],
					dddd: dateFormats[locale].dayNames[D + 7],
					m:    m + 1,
					mm:   pad(m + 1),
					mmm:  dateFormats[locale].monthNames[m],
					mmmm: dateFormats[locale].monthNames[m + 12],
					yy:   String(y).slice(2),
					yyyy: y,
					h:    H % 12 || 12,
					hh:   pad(H % 12 || 12),
					H:    H,
					HH:   pad(H),
					M:    M,
					MM:   pad(M),
					s:    s,
					ss:   pad(s),
					l:    pad(L, 3),
					L:    pad(L > 99 ? Math.round(L / 10) : L),
					t:    H < 12 ? "a"  : "p",
					tt:   H < 12 ? "am" : "pm",
					T:    H < 12 ? "A"  : "P",
					TT:   H < 12 ? "AM" : "PM",
					Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
					o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
					S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
				};
			
			return mask.replace(token, function ($0) {
				return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
			});
		};
	}();
	
	return this;
}

// Publish as a module, if in a CommonJS environment
if(typeof(module) != 'undefined') {
	module.exports = Localize;
}
