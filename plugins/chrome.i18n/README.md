# chrome.i18n Plugin

This plugin allows apps to present localised content to users according to the language / locale settings on their device.

## Status

Stable on Android and iOS.

## Reference

The API reference is [here](https://developer.chrome.com/apps/i18n.html).

## Usage (with Mobile Chrome Apps)

To use the plugin, create a `_locales` directory within your web assets directory. Inside this, create a directory for each locale for which you can supply translations. See the API reference above for the format of the files to place in those directories, and for the documentation of functions in the chrome.i18n namespace.

## Usage (with Apache Cordova Apps)

This plugin can be used by Apache Cordova applications, but some of the automated installation steps must be done manually:

  * The locale directory within your web assets directory should be named `MCA_locales`, rather than `_locales`.
  * The specific locale directories within `MCA_locales` must be lower-cased, with an underscores separating the country code from the language code, if it is present. For example, `en` and `en_us` will be read as locale directories, but `en-us`, `en_US` and `en-US` will not.

## Limitations

* Placeholders are not replaced in CSS files
