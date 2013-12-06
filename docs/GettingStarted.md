# Getting Started with Mobile Chrome Apps

Please read the [Installation Guide](Installation.md) first.

## The initial import of your Chrome Packaged App

Now that you have installed the Mobile Chrome Apps framework, lets use it to create your first App.

### Step 1: Create a Project

Starting from scratch:

    mca create com.companyname.YourApp

Importing an existing desktop chrome app:

    mca create com.companyname.YourApp --source=path/to/existing/ChromeApp

* Currently, `--source` will create a _copy_ of your chrome app, so any changes will need to be synchronized manually.
  * Support for symlinks is coming shortly.
* Note: Don't create projects inside the `mobile-chrome-apps` directory, since that is a git repo which mca command will auto-update.

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
* Import from the path you just created with `mca`.
    * You should expect to have two projects to import, one of which is `*-CordovaLib`

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

_Every time_ you change them, you _must_ run `./mca prepare` from the root of your project.  Otherwise, those changes will not be reflected when running your app.


## Experiencing Hiccups?

Please [reach out to us](mailto:mobile-chrome-apps@googlegroups.com).


## Completed Successfully?

Now read the [API Status document](APIStatus.md).
