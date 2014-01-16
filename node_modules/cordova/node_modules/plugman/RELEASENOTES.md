<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
# 
# http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->
# Cordova-plugman Release Notes

### 0.18.0 (Jan 15, 2014)
* CB-5770 plugman prepare.js script content wrapping no longer allows ending parens/braces to be commented out from end of line comment
* CB-4871 Reduced package size significantly.
* CB-5720 Allow <resource-file> on Android
* CB-5006 Add --searchpath option for local plugin search path
* CB-5701 Reference custom frameworks using relative paths
* CB-5495, CB=5568 Fix config.xml path for ios

## 0.17.0 (Dec 11, 2013)
* CB-5579 Add support for --www param for install, uninstall, prepare commands.

## 0.16.0 (Dec 5, 2013)
* Added amazon-fireos platform.
* Added ubuntu platform
* CB-5034 Document registry functions in plugman
* CB-5584 Fix git clone of not working on windows.
* CB-5238 Add support for <framework src="..." custom="true" />
* CB-5367 Reject non-whitelisted org.apache.cordova plugins
* Write plugin metadata (ID and version) into cordova_plugins.js

## 0.15.0 (Nov 8, 2013)
* CB-4994 Update xcode dependency to parse Xcode 5 capabilities.
* CB-5091 Use cwd option rather than shell.cd when cloning plugin repos
* CB-4872 Updated default engine names to include windows scripts

## 0.14.0 (Oct 28, 2013)

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
