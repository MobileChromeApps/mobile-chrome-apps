// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = cordova.require('cordova/exec');
var runtime = require('org.chromium.runtime.runtime');

exports.getAcceptLanguages = function(callback) {
    // In the chrome implementation, acceptLanguage value can change with updates so we make a native call to get the system language
    exec(callback, callback, 'ChromeI18n', 'getAcceptLanguages', []);
};

exports.getMessage = function(messageName, substitutions) {
    // In the chrome implementation, the locale to translate to DOES NOT change with updates, it is keyed of window.navigator.language which is static for a session.
    // This is implemented in _getLocalesToUse()
    if(
        (typeof messageName !== 'string') ||
        (Array.isArray(substitutions) && substitutions.length > 9)
    ) {
        return;
    }
    messageName = messageName.toLowerCase();
    var ret = '';
    var localeChain = _getLocalesToUse();
    var contentsForMessageName = _getMessageFromMessageJson(messageName, localeChain);
    if(contentsForMessageName) {
        ret = _applySubstitutions(contentsForMessageName, substitutions);
    }
    return ret;
};

function _endsWith(string, endString) {
    if(endString.length > string.length) {
        return false;
    } else {
        return (string.lastIndexOf(endString) === string.length - endString.length);
    }
}

function _getFilePathForLocale(locale) {
    return '/CCA_locales/' + locale.toLowerCase() + '/messages.json';
}

function _toLowerCaseMessageAndPlaceholders(obj) {
    if(typeof obj !== 'undefined') {
        var newObj = {};
        for(var field in obj) {
            if(obj[field].placeholders) {
                var newPlaceholders = {};
                for(var placeholderField in obj[field].placeholders) {
                    newPlaceholders[placeholderField.toLowerCase()] = obj[field].placeholders[placeholderField];
                }
                obj[field].placeholders = newPlaceholders;
            }
            newObj[field.toLowerCase()] = obj[field];
        }
        return newObj;
    }
}

function _getDefaultLocale() {
    var manifestJson = runtime.getManifest();
    if(manifestJson.default_locale) {
        return manifestJson.default_locale;
    } else {
        throw new Error('Default locale not defined');
    }
}

var memoizedJsonContents = {};
function _getMessageFromMessageJson(messageName, localeChain) {
    for(var i = 0; i < localeChain.length; i++) {
        var locale = localeChain[i];
        if (!memoizedJsonContents[locale]) {
            var fileName = _getFilePathForLocale(locale);
            var xhr = new XMLHttpRequest();
            xhr.open('GET', fileName, false /* sync */);
            xhr.send(null);
            var contents = eval('(' + xhr.responseText + ')');
            // convert all fields to lower case to check case insensitively
            contents = _toLowerCaseMessageAndPlaceholders(contents);
            memoizedJsonContents[locale] = contents;
        }
        if(memoizedJsonContents[locale][messageName]) {
            return memoizedJsonContents[locale][messageName];
        }
    }
}

var availableLocales = {};
function _isLocaleAvailable(locale) {
    if (!availableLocales.hasOwnProperty(locale)) {
        var fileName = _getFilePathForLocale(locale);
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', fileName, false);
        xhr.send(null);
        availableLocales[locale] = (xhr.status === 200);
    }
    return availableLocales[locale];
}

var chosenLocales;
function _getLocalesToUse() {
    if(!chosenLocales) {
        // language returned by window.navigator is in format en-US, need to change it to en_us
        var windowLocale = window.navigator.language.replace('-', '_').toLowerCase();
        var localesToUse = [windowLocale];
        // Construct fallback chain
        var lastIndex;
        while((lastIndex = windowLocale.lastIndexOf('_')) !== -1) {
            windowLocale = windowLocale.substring(0, lastIndex);
            localesToUse.push(windowLocale);
        }
        var defaultLocale = _getDefaultLocale().toLowerCase();
        if(localesToUse.indexOf(defaultLocale) == -1) {
            localesToUse.push(defaultLocale);
        }

        chosenLocales = [] ;
        for(var i = 0; i < localesToUse.length; i++) {
            var currentLocale = localesToUse[i];
            if(_isLocaleAvailable(currentLocale)) {
                chosenLocales.push(currentLocale);
            }
        }
    }
    if(chosenLocales.length == 0) {
        throw new Error('No usable locale.');
    }
    return chosenLocales;
}

function _getSubstitutionString(match, substitutions) {
    if(match == '$$') {
        return '$';
    } else if(match == '$') {
        return '';
    }
    else {
        var locBaseOne = parseInt(match.substring(1));
        if(isNaN(locBaseOne) || locBaseOne <= 0) {
            return '';
        }

        if(substitutions[locBaseOne - 1]) {
            return substitutions[locBaseOne - 1];
        } else {
            return '';
        }
    }
}

function _getPlaceholderText(placeholders, substitutions, match) {
    // Switch to lower case to do case insensitive checking for matches
    var placeholderField = match.substring(1, match.length - 1);
    placeholderField = placeholderField.toLowerCase();
    if(placeholders[placeholderField]) {
        // form $1, $2 etc or '$$' or '$'
        var placeholderText = placeholders[placeholderField].content.replace(/\$(([0-9]+)|\$)?/g, function(match) {
            var substitutionString = _getSubstitutionString(match, substitutions);
            return substitutionString;
        });
        return placeholderText;
    } else {
        return '';
    }
}

function _applySubstitutions(messageObject, substitutions) {
    if(typeof substitutions === 'undefined') {
        substitutions = [];
    } else if(Object.prototype.toString.call(substitutions) !== '[object Array]') {
        substitutions = [substitutions];
    }
    // Look for any strings of form $WORD$ eg: $1stName$, form $1, $2 etc or any lone '$'
    // Order of preference is as in this comment
    var ret = messageObject.message.replace( /\$(([0-9a-zA-Z_]*\$)|([0-9]*))?/g, function(matchedString) {
        // check which category of matchedString it is
        if(matchedString.match(/\$[0-9a-zA-Z_]+\$/)) { // form $WORD$
            var placeholderText = _getPlaceholderText(messageObject.placeholders, substitutions, matchedString);
            return placeholderText;
        } else { // form $1, $2 etc or '$$' or '$'
            var substitutionString = _getSubstitutionString(matchedString, substitutions);
            return substitutionString;
        }
    });
    return ret;
}
