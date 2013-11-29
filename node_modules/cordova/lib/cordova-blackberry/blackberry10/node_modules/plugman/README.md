plugman
===================

A command line tool to distribute and package plugins for use with Apache Cordova, nee PhoneGap.

This document defines tool usage and the plugin format specification. This is not an official document of the Apache Cordova project.


## Design Goals
* facilitate programmatic installation and manipulation of plugins
* detail the dependencies and components of individual plugins
* allow code reuse between different target platforms


## Usage

Adding plugins:

    plugman --platform PLATFORM --project PROJECT-PATH --plugin PLUGIN-PATH|PLUGIN-GIT-URL|PLUGIN-NAME

Example:

    plugman --platform android --project . --plugin ~/plugins/ChildBrowser

Removing plugins:
 
    plugman --platform PLATFORM --project PROJECT-PATH --plugin PLUGIN-PATH|PLUGIN-GIT-URL|PLUGIN-NAME --remove

Example:

    plugman --platform android --project . --plugin ~/plugins/ChildBrowser --remove

Listing plugins:
 
    plugman --list

    
### Supported Platforms
* iOS
* Android

### Supported Plugins
Andrew Lunny's tamed plugins for ChildBrowser and PGSQLite will work but need to be massaged into the right format. 


## Development

    git clone https://github.com/imhotep/plugman.git
    cd plugman
    npm install -g
   


## Plugin Directory Structure

A plugin is typically a combination of some web/www code, and some native code.
However, plugins may have only one of these things - a plugin could be a single
JavaScript, or some native code with no corresponding JavaScript.

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

## plugin.xml Manifest Format

The `plugin.xml` file is an XML document in the plugins namespace -
`http://www.phonegap.com/ns/plugins/1.0`. It contains a top-level `plugin`
element defining the plugin, and children that define the structure of the
plugin.

A sample plugin element:

	<?xml version="1.0" encoding="UTF-8"?>
    <plugin xmlns="http://www.phonegap.com/ns/plugins/1.0"
        xmlns:android="http://schemas.android.com/apk/res/android"
        id="com.alunny.foo"
        version="1.0.2">


### &lt;plugin&gt; element

The `plugin` element is the top-level element of the plugin manifest. It has the
following attributes:

#### xmlns (required)

The plugin namespace - `http://www.phonegap.com/ns/plugins/1.0`. If the document
contains XML from other namespaces - for example, tags to be added ot the
AndroidManifest.xml file - those namespaces should also be included in the
top-level element.

#### id (required)

A reverse-domain style identifier for the plugin - for example, `com.alunny.foo`

#### version (required)

A version number for the plugin, that matches the following major-minor-patch
style regular expression:

    ^\d+[.]\d+[.]\d+$

### Child elements

### &lt;engines&gt; element

The child elements of the `<engines>` element specify versions of
Apache Cordova-based frameworks that this plugin supports. An example:

    <engines>
        <engine name="cordova" version="1.7.0" />
        <engine name="cordova" version="1.8.1" />
        <engine name="worklight" version="1.0.0" />
    </engines>

Similarly to the `version` attribute for the `<plugin>` element,
the version string specified should match a major-minor-patch string
conforming to the regular expression:

    ^\d+[.]\d+[.]\d+$

Engine elements may also have fuzzy matches to avoid repetition, and reduce
maintenance when the underlying platform is updated. A minimum of `>`, `>=`,
`<` and `<=` should be supported by tools, such as:

    <engines>
        <engine name="cordova" version=">=1.7.0" />
        <engine name="cordova" version="<1.8.1" />
    </engines>

plugman will abort plugin installation if the target project does not meet the engine constraints.



### &lt;name&gt; element

A human-readable name for the plugin. The text content of the element contains
the name of the plugin. An example:

    <name>Foo</name>

This element does not yet handle localization.


### &lt;asset&gt; element

One or more elements listing the files or directories to be copied into a
Cordova app's `www` directory. A couple of samples:

    <!-- a single file, to be copied in the root directory -->
    <asset src="www/foo.js" target="foo.js" />
    <!-- a directory, also to be copied in the root directory -->
    <asset src="www/foo" target="foo" />

All assets tags require both a `src` attribute and a `target` attribute.

#### src (required)

Where the file or directory is located in the plugin package, relative to the
`plugin.xml` document.

#### target (required)

Where the file or directory should be located in the Cordova app, relative to
the `www` directory.

Assets can be targeted to subdirectories - for instance:

    <asset src="www/new-foo.js" target="js/experimental/foo.js" />

would create the `js/experimental` directory in the `www` directory, if not
present, and then copy the file `new-foo.js` as `foo.js` into that directory.

If a file exists at the target location, tools based on this specification
should stop the installation process and notify the user of the conflict.

### &lt;platform&gt;

Platform tags identify platforms that have associated native code. Tools using
this specification can identify supported platforms and install the code into
Cordova projects.

A sample platform tag:

    <platform name="android">
    <!-- android specific elements -->
    </platform>
    <platform name="ios">
    <!-- ios specific elements -->
    </platform>

#### name (required)

The `name` attribute identifies a platform as supported - it also associates the
element's children with that platform.

Platform names should be all-lowercase. Platform names, as arbitrarily chosen,
are listed:

* android
* ios


### &lt;source-file&gt;

`source-file` elements identify executable source code that should be installed
into a project. A couple of examples:

    <!-- android -->
    <source-file src="src/android/Foo.java"
                    target-dir="src/com/alunny/foo" />
    <!-- ios -->
    <source-file src="CDVFoo.m" />

As with assets, if a `source-file` would overwrite an existing file, tools
should notify the user and stop, like, right away.

#### src (required)

Where the file is located, relative to the `plugin.xml` file.

#### target-dir

A directory where the files should be copied into, relative to the root of the
Cordova project.

In practice, this is most important for Java-based platforms, where a file in
the package `com.alunny.foo` has be located under the directory
`com/alunny/foo`. For platforms where the source directory is not important,
plugin authors should omit this attribute.

### &lt;config-file&gt;

Identifies an XML-based configuration file to be modified, where in that
document the modification should take place, and what should be modified.

At this stage in the spec, the `config-file` element only allows for appending
new children into an XML document. The children are XML literals that are the
to be inserted in the target document.

Example:

    <config-file target="AndroidManifest.xml" parent="/manifest/application">
        <activity android:name="com.foo.Foo"
                  android:label="@string/app_name">
                  <intent-filter>
                  </intent-filter>
        </activity>
    </config-file>

#### target

The file to be modified, and the path relative to the root of the Cordova
project.

If this file does not exist, the tool will exit.

#### parent

An absolute XPath selector pointing to the parent of the elements to be added to
the config file.

### &lt;plugins-plist&gt;

This is OUTDATED. Only applies to Cordova 2.2.0 and below). Use &lt;config-file&gt; tag (same as Android) for newer versions of Cordova.

Example:

    <config-file target="config.xml" parent="/cordova/plugins">
         <plugin name="ChildBrowser"
             value="ChildBrowserCommand"/>
    </config-file>

Specifies a key and value to append to the correct `AppInfo.plist` file in an
iOS Cordova project. Example:

    <plugins-plist key="Foo"
                   string="CDVFoo" />

This may be an implementation detail leaking through, and could be merged with
the `config-file` element at some later point.

### &lt;resource-file&gt; and &lt;header-file&gt;

Like source files, but specifically for platforms that distinguish between
source files, headers, and resources (iOS)

Examples:

    <resource-file src="CDVFoo.bundle" />
    <resource-file src="CDVFooViewController.xib" />
    <header-file src="CDVFoo.h" />

This is probably an implementation detail leaking through, and future versions
of this document will likely merge these elements with `source-file`.


### &lt;framework&gt;

Identifies a framework (usually part of the OS/platform) that the plugin depends on.

Examples:

    <framework src="libsqlite3.dylib" />
    <framework src="social.framework" weak="true" />

plugman identifies the framework through the `src` attribute and attempts to add the framework to the Cordova project, in the correct fashion for a given platform.

The optional `weak` attribute is a boolean denoting whether the framework should be weakly-linked. Default is `false`.

## Variables

In certain cases, a plugin may need to make configuration changes dependent on
the target application. For example, to register for C2DM on Android, an app
with package id `com.alunny.message` would need a permission like:

    <uses-permission
    android:name="com.alunny.message.permission.C2D_MESSAGE"/>

In cases like this (where the content inserted from the `plugin.xml` file is
not known ahead of time), variables can be indicated by a dollar-sign and a
series of capital letters, digits and underscores. For the above example, the
`plugin.xml` file would include this tag:

    <uses-permission
    android:name="$PACKAGE_NAME.permission.C2D_MESSAGE"/>

plugman replaces variable references with the
correct value, if specified, or the empty string otherwise. The value of the
variable reference may be detected (in this case, from the `AndroidManifest.xml`
file, or specified by the user of the tool; the exact process is dependent on
the particular tool.

Certain variable names should be reserved - these are listed below.

### $PACKAGE_NAME

The reverse-domain style unique identifier for the package - corresponding to
the `CFBundleIdentifier` on iOS or the `package` attribute of the top-level
`manifest` element in an `AndroidManifest.xml` file.

## Project Directory Structure
TODO: show how the foo plugin example from above will have its files placed in a cordova project after running plugman

## Authors

* Andrew Lunny
* Fil Maj
* Mike Reinstein
* Anis Kadri

## Contributors

Michael Brooks


## License

Apache
