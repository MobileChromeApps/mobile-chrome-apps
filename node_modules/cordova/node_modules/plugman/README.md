# plugman

A command line tool to install and uninstall plugins for use with [Apache Cordova](http://cordova.io) projects.

This document defines tool usage.

## Requirements

You must have `git` on your PATH to be able to install plugins directly from remote git URLs.

## Plugin Specification

--&gt; [Available on docs.cordova.io](http://cordova.apache.org/docs/en/3.0.0/plugin_ref_spec.md) &lt;--

## Quickstart

    npm install -g plugman

## Design Goals

* Facilitate programmatic installation and manipulation of plugins
* Detail the dependencies and components of individual plugins
* Allow code reuse between different target platforms

## Supported Platforms

* iOS
* Android
* BlackBerry 10
* Windows Phone (7+8)

## Command Line Usage

    plugman install --platform <ios|android|blackberry10|wp7|wp8> --project <directory> --plugin <name|url|path> [--plugins_dir <directory>] [--www <directory>] [--variable <name>=<value> [--variable <name>=<value> ...]]
    plugman uninstall --platform <ios|android|blackberr10|wp7|wp8> --project <directory> --plugin <id> [--www <directory>] [--plugins_dir <directory>]

* Using minimum parameters, installs a plugin into a cordova project. You must specify a platform and cordova project location for that platform. You also must specify a plugin, with the different `--plugin` parameter forms being:
  * `name`: The directory name where the plugin contents exist. This must be an existing directory under the `--plugins_dir` path (see below for more info) or a plugin in the Cordova registry.
  * `url`: A URL starting with https:// or git://, pointing to a valid git repository that is clonable and contains a `plugin.xml` file. The contents of this repository would be copied into the `--plugins_dir`.
  * `path`: A path to a directory containing a valid plugin which includes a `plugin.xml` file. This path's contents will be copied into the `--plugins_dir`.
* `--uninstall`: Uninstalls an already-`--install`'ed plugin from a cordova project. Specify the plugin ID.

Other parameters: 

* `--plugins_dir` defaults to `<project>/cordova/plugins`, but can be any directory containing a subdirectory for each fetched plugin.
* `--www` defaults to the project's `www` folder location, but can be any directory that is to be used as cordova project application web assets.
* `--variable` allows to specify certain variables at install time, necessary for certain plugins requiring API keys or other custom, user-defined parameters. Please see the [plugin specification](plugin_spec.md) for more information.

## Node Module Usage

    node
    > require('plugman')
    { install: [Function: installPlugin],
      uninstall: [Function: uninstallPlugin],
      fetch: [Function: fetchPlugin],
      search: [Function: search],
      publish: [Function: publish],
      unpublish: [Function: unpublish],
      adduser: [Function: adduser],
      prepare: [Function: handlePrepare] }

### `install` method

    module.exports = function installPlugin(platform, project_dir, id, plugins_dir, subdir, cli_variables, www_dir, callback) {

Installs a plugin into a specified cordova project of a specified platform.

 * `platform`: one of `android`, `ios`, `blackberry10`, `wp7` or `wp8`
 * `project_dir`: path to an instance of the above specified platform's cordova project
 * `id`: a string representing the `id` of the plugin, a path to a cordova plugin with a valid `plugin.xml` file, or an `https://` or `git://` url to a git repository of a valid cordova plugin or a plugin published to the Cordova registry
 * `plugins_dir`: path to directory where plugins will be stored, defaults to `<project_dir>/cordova/plugins`
 * `subdir`: subdirectory within the plugin directory to consider as plugin directory root, defaults to `.`
 * `cli_variables`: an object mapping cordova plugin specification variable namess (see [plugin specification](plugin_spec.md)) to values 
 * `www_dir`: path to directory where web assets are to be copied to, defaults to the specified project directory's `www` dir (dependent on platform)
 * `callback`: callback to invoke once complete. If specified, will pass in an error object as a first parameter if the action failed. If not and an error occurs, `plugman` will throw the error

### `uninstall` method

    module.exports = function uninstallPlugin(platform, project_dir, id, plugins_dir, cli_variables, www_dir, callback) {

Uninstalls a previously-installed cordova plugin from a specified cordova project of a specified platform.

 * `platform`: one of `android`, `ios`, `blackberry10`, `wp7` or `wp8`
 * `project_dir`: path to an instance of the above specified platform's cordova project
 * `id`: a string representing the `id` of the plugin
 * `plugins_dir`: path to directory where plugins are stored, defaults to `<project_dir>/cordova/plugins`
 * `subdir`: subdirectory within the plugin directory to consider as plugin directory root, defaults to `.`
 * `cli_variables`: an object mapping cordova plugin specification variable namess (see [plugin specification](plugin_spec.md)) to values 
 * `www_dir`: path to directory where web assets are to be copied to, defaults to the specified project directory's `www` dir (dependent on platform)
 * `callback`: callback to invoke once complete. If specified, will pass in an error object as a first parameter if the action failed. If not and an error occurs, `plugman` will throw the error

### `fetch` method

Copies a cordova plugin into a single location that plugman uses to track which plugins are installed into a project.

    module.exports = function fetchPlugin(plugin_dir, plugins_dir, link, subdir, git_ref, callback) {

 * `plugin_dir`: path, URL to a plugin directory/repository or name of a plugin published to the Cordova registry.
 * `plugins_dir`: path housing all plugins used in this project
 * `link`: if `plugin_dir` points to a local path, will create a symbolic link to that folder instead of copying into `plugins_dir`, defaults to `false`
 * `subdir`: subdirectory within the plugin directory to consider as plugin directory root, defaults to `.`
 * `gitref`: if `plugin_dir` points to a URL, this value will be used to pass into `git checkout` after the repository is cloned, defaults to `HEAD`
 * `callback`: callback to invoke once complete. If specified, will pass in an error object as a first parameter if the action failed. If not and an error occurs, `plugman` will throw the error

### `prepare` method

Finalizes plugin installation by making configuration file changes and setting up a JavaScript loader for js-module support.

    module.exports = function handlePrepare(project_dir, platform, plugins_dir) {

 * `project_dir`: path to an instance of the above specified platform's cordova project
 * `platform`: one of `android`, `ios`, `blackberry10`, `wp7` or `wp8`
 * `plugins_dir`: path housing all plugins used in this project

## Registry related actions

Plugman uses an [npmjs.org](http://github.com/isaacs/npmjs.org) based registry to host plugins. The URL can be configured in the `config.js` file at the root of the installation folder.

### `config.js` file

    module.exports = {
        registry: "http://registry.cordova.io"
    }

### `adduser` method

Adds a user account to the registry. Function takes no arguments other than a an optional callback

    module.exports = function(callback) {

### `publish` method

Publishes plugins to the registry. `plugin_paths` is an array of plugin paths to publish to the reigstry.

    module.exports = function(plugin_paths, callback) {

### `unpublish` method

unpublishes plugins from the registry. Can unpublish a version by specifying `plugin@version` or the whole plugin by just specifying `plugin`. `plugins` is an array of `plugin[@version]` elements.

    module.exports = function(plugins, callback) {

### `search` method

Searches plugins in the registry. `search_opts` is an array of keywords

    module.exports = function(search_opts, callback) {

## Example Plugins

- Google has a [bunch of plugins](https://github.com/MobileChromeApps/chrome-cordova/tree/master/plugins) which are maintained actively by a contributor to plugman
- Adobe maintains plugins for its Build cloud service, which are open sourced and [available on GitHub](https://github.com/phonegap-build)
- BlackBerry has a [bunch of plugins](https://github.com/blackberry/cordova-blackberry/tree/master/blackberry10/plugins) offering deep platform integration
- Core and 3rd party plugins can be found on the [Cordova Registry](http://plugins.cordova.io).

## Development

Basic installation:

    git clone https://git-wip-us.apache.org/repos/asf/cordova-plugman.git
    cd cordova-plugman
    npm install -g

Linking the global executable to the git repo:

    git clone https://git-wip-us.apache.org/repos/asf/cordova-plugman.git
    cd cordova-plugman
    npm install
    sudo npm link

### Running Tests

    npm test

## Plugin Directory Structure

A plugin is typically a combination of some web/www code, and some native code.
However, plugins may have only one of these things - a plugin could be a single
JavaScript file, or some native code with no corresponding JavaScript.

Here is a sample plugin named foo with android and ios platforms support, and 2 www assets.

```
foo-plugin/
|- plugin.xml     # xml-based manifest
|- src/           # native source for each platform
|  |- android/
|  |  `- Foo.java
|  `- ios/
|     |- CDVFoo.h
|     `- CDVFoo.m
|- README.md
`- www/
   |- foo.js
   `- foo.png
```

This structure is suggested, but not required.

## Contributors

See the [package.json](package.json) file for attribution notes.

## License

Apache License 2.0
