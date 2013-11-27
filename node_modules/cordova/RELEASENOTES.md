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
# Cordova-cli changelog

## 3.1.0-0.2.0

* increased version of plugman to 0.14.0 in package.json
* CB-5187: remove unused var os_platform
* CB:5187 on node  windows broken compile, emulate, run
* [CB-4976] Don't symlink into ~/.cordova/lib for local libs
* [CB-5142] improve grammar of emulate description
* [CB-5147] emulate needs a space before error message
* CB-5125 add tests for chil process spawn
* CB-5125: replace child process exec with spawn
* CB-4748: Fail quickly if dir passed to cordova create is not empty.
* CB-5106: removed flood of cp error messages when running tests
* CB-5106:[wp7] fixed broken wp7 tests
* CB-5106:[win8] fixed tests for windows 8
* Using .find to grab visualelements instead
* CB-5066: fixed issue with visual elements not being referenced correctly
* windows8: remove debug console.log
* windows8: fixed project parser issue, and updated tests
* Update tests for commit d1c8024: update_project() should not call update_www() directly
* begin firefoxos tests
* CB-5066: dealing with windows8 issues
* config.xml helper function is used, removed error merge of wp folder.
* CB-5066: continuing merge of windows 8 stuff
* CB-5066: merged in windows 8 support into master from cordova-3.1.x
* config.xml helper function is used, removed error merge of wp folder.
* CB-5066: continuing merge of windows 8 stuff
* CB-5066: merged in windows 8 support into master from cordova-3.1.x
* CB-2234 Add 'cordova info' command
* CB-4774: Copy www assets before running plugin prepare
* cordova help should return a Q. fixes CB-5070
* updated to a version greater than our latest version on npm
* added not about platform+os restrictions
* added myself as a contributor, CB-5042 added info on windows8
* CB-5067: added exception incase no platform level config.xml or defaults.xml exisit
* added temp config path for ffos, fixed wp8 config_xml function
* [CB-4774] Updated prepare flow to make platform config.xml a build output   - Adds a new method to
* CB-5032: clarify the help text
* [CB-4621] Updating run and emulate commands to always provide default options
* Log requests in cordova serve
* Make cordova serve ignore dot files.
* CB-4957: added fix for FFOS
* Update "cordova serve" to work with promises refactoring
* [CB-4774] Display proper error if cordova prepare run not in project dir.
* Fixes a bug where cordova prepare bombs on a config missing a content element   - Changes an undefi
* Bumping elementtree version to 0.1.5 to match plugman and support namespaced xml elements
* Fix cli.js tests broken by --silent change.
* [CB-4877]: Add basic logging, --silent flag.
* Fix busted test.
* First pass
* [CB-4883]: Graceful handling of lazy loading errors.
* reapplied change to add event mid build to allow mods to www folder pre_package  aka 775e969f9cc27a
* Remove two debugger; lines that snuck in.
* [CB-4604] Execute hooks directly (not .bat files) cross-platform
* Refactor to use Q.js promises in place of callbacks everywhere.
* [CB-4837]: Version 3.0.10. Depends on Plugman 0.12.x.
* Add missing license headers
* Update repo versions to 3.1.0-rc1
* Add `cordova update foo` command, with tests. [CB-4777]
* Add version numbers to `platform ls` output.
* [CB-4545] support for merges directory on both wp7 & wp8
* Rename CHANGELOG.md -> RELEASENOTES.md
* Fix expectation for platform ls test, for firefoxos
* Fix platforms.js: firefoxos.parser
* CB:4657 added ffos support to cli
* CB-4657: added staging_dir function to ff parser
* add default manifest properties for firefox os platform
* make the firefoxos parser actually build the project
* change firefoxos link to tarball
* add firefox platform
* [CB-4797] Fix a crash on undefined platform in path.
* [CB-4797] Add missing return statement in cordova serve
* Fix broken tests due to lazy requiring change.
* [CB-4797] Change `serve` command to serve platforms keyed off of path component.
* [CB-4793] Lazily require modules in some places.
* [CB-4325] Run platform installs in serial instead of in parallel
* Version updated to 3.0.10-dev

## 3.0.10

Important note: This version targets Cordova version 3.1.0-rc1.

### Notable

- You can now `cordova platform update <platform>`, which calls the platform's update script. Android, iOS, WP7 and WP8 have update scripts. Please give this a try and report any problems!

### Features

- `platform ls` now shows the version of each installed platform.
- `merges` are now supported on WP7+8.
- `serve` now serves from `http://myhost.com/ios/www`, `/android/www`, etc., serving all platforms at once.
- Speed significantly improved by importing modules only on demand. `prepare` is much faster, `platform ls` more than 10x faster.
- Now with Firefox OS!

### Bugfixes

- Corner cases in `serve`.


## 3.0.9

### Features

- `platform ls` now shows both installed and available-to-install platforms. [CB-3904](https://issues.apache.org/jira/browse/CB-3904)

### Bugfixes

- Plugins are now installed serially across all installed platforms, rather than in parallel. This avoids race conditions in dependency installation. [CB-4184](https://issues.apache.org/jira/browse/CB-4184)
- (WP8) All files from project www dir are now copied into the binary, not the top-level www. This means merges and plugin assets are correctly handled.
