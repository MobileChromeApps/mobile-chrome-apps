# Getting Started with Mobile Chrome Apps

Please read the [Installation Guide](Installation.md) first.

## The initial import of your Chrome Packaged App

Now that you have installed the Mobile Chrome Apps framework, lets use it to create your first App.

### Step 1: Create a Project

    mca create com.companyname.YourApp --source=path/to/ChromeApp

* Don't create projects inside the `mobile-chrome-apps` directory.
* `--source` flag is optional, if you leave it out, you will start with a HelloWorld template.
* Currently, `--source` will create a _copy_ of your chrome app, so any changes will need to be synchronized manually.  (We do plan to support symlinks eventually.)

### Step 2: Open the Native App Template

The easiest way to build your app is through an IDE.

#### iOS

* Open xcode:

        cd YourApp
        open platforms/ios/*.xcodeproj

#### Android

* open Eclipse
* From the menu, `File` -> `Import`
* Chose `Android` > `Existing Android Code Into Workspace`.
* Import `path/to/YourApp/platforms/android`.
* Add the Google Play Services library [as outlined here](http://developer.android.com/google/play-services/setup.html).

### Step 3: Build and run

You should be all set to build and run, but there are a few things to watch for.

#### iOS

* Make sure you are building the right target.
  * In the top left (beside Run&Stop buttons) there is a dropdown to select target project and device.  Ensure that `YourApp` is selected and _not_ `CordovaLib`.

#### Android

* You will need to create a Run Configuration (as with all Java applications).  You _usually_ get prompted for this the first time.
* You will need to manage your devices/emulators the first time as well.

### Step 4: Icons, splash screen, settings, etc

[Coming soon]


## Important!: Making Changes to your App

Your HTML, CSS and JS files live within the `www` directory.

_Every time_ you change them, you _must_ run `./cordova prepare` from the root of your project.  Otherwise, those changes will not be reflected when running your app.


## Experiencing Hiccups?

Please [reach out to us](mailto:mobile-chrome-apps@googlegroups.com).


## Completed Successfully?

Now read the [API Status document](APIStatus.md).
