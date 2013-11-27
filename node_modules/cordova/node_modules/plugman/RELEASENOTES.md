# Changelog

## 0.14.0

* CB-5192 Plugman engine check fails on Windows
* [CB-5184] Fix uninstall logic being too aggressive
* CB-4872 - updated default plugin to include new bb10 script
* CB-4872 - took out custom version compare and went back to semver
* Overhaul dependency uninstallation
* [CB-4872] - adding in custom semver check for project
* [CB-4872] - updated paths to version files
* Update action-stack to avoid static platform detection + test if parseProjectFile is present instea
* Update spec to match new ios parse method name
* Update references to old ios parse method
* Rename parse method and add a write method to result + parseIOSProjectFiles --> parseProjectFile +
* updating README.rd doc
* CB-5065 remove breaking parameter
* increased version to 0.14.0 to reflect that it is newer than published version on npm
* Correctly tell plugman which object in config to remove
* [CB-5012]: No whitespace in empty plist string nodes.
* CB-4983 plugin name check
* [windows8][CB-4943] .appxmanifest should be treated like .xml, not like a plist-xml
* [CB-4809]: Check that dependencies' IDs match the <dependency> tags
* [CB-4877]: Add --silent flag and basic logging.
* Removed extra comma
* Refactor to use Q.js promises in place of callbacks everywhere.
* [CB-4837]: Version 0.12.0. Release notes updated.
* Rename CHANGELOG.md -> RELEASENOTES.md
* CB-4492 tracking which of cli or plugman is used to fetch from registry
* removed unncessary console.logs
* add full ff support to plugman
* add firefoxos
* removed unncessary console.logs
* add full ff support to plugman
* add firefoxos
* Fix tests broken by lazy module requiring.
* CB-4786 adding documentation
* [CB-4793] Lazily require modules in plugin.js
* CB-4786 adding owner and checking in some spec requirements
* CB-4770 dependent plugins can be fetched from registry
* Updated version to 0.11.1-dev

## 0.12.0

### Features

- Firefox OS support.
- Speed improvements (many commands ~350ms faster)
- Dependencies can now be fetched from the plugin repository.

## 0.11.0

### Features

- Windows phone support
- Track download counts from the plugin registry [CB-4492](https://issues.apache.org/jira/browse/CB-4492)
- Plugin URLs can now be specified with a hash giving a git ref and subdirectory, as in `https://github.com/foo/bar.git#gitref:sub/dir`. Both parts are optional: `.../bar.git#gitref` and `.../bar.git#:sub/dir` both work. [CB-4622](https://issues.apache.org/jira/browse/CB-4622)
- Engine data is now stored in the registry, and Plugman will not install plugins your Cordova version cannot support. [CB-4494](https://issues.apache.org/jira/browse/CB-4494)
- `<lib-file>` tags are now allowed on Android. [CB-4430](https://issues.apache.org/jira/browse/CB-4430)

### Bugfixes

- `plugin rm` now doesn't choke when a file is already deleted
- Fixed some trouble with filesystem paths vs. web paths; improves Windows host support.
- Projects beginning with `x`, `y`, and `z` now work. [CB-4502](https://issues.apache.org/jira/browse/CB-4502)
