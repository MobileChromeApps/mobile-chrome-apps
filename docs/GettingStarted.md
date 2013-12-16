# Getting Started with Mobile Chrome Apps

Please make sure you have completed the [Installation Guide](Installation.md) first.

### Step 1: Create a Project

    mca create com.companyname.YourApp [--source=...]

* Using the `--source` flag will import an already existing chrome app (by creating a _copy_).

### Step 2: Building and Running your application

You can build and run your application either:
* Option A: from the command line, using the `mca` tool, or
* Option B: by using an IDE, like `Eclipse` or `Xcode`.

Both options are described below.

Note that you must use the command line `mca` tool with either option (specifics are described in Step 3, below).  The use of an IDE is entirely optional (but often useful) to assist with launching, configuring, and debugging your hybrid mobile application's native bits.

### Step 2, Option A: Using the command line

[Coming Soon]

* `mca build`
* `mca emulate`
* `mca run`

### Step 2, Option B: Using an IDE

#### iOS

* In Xcode, open the `xcodeproj` file from within the `platforms/ios/` directory.
  * From the command line:

        cd YourApp
        open platforms/ios/*.xcodeproj

* Make sure you are building the right target.
  * In the top left (beside Run&Stop buttons) there is a dropdown to select target project and device.  Ensure that `YourApp` is selected and _not_ `CordovaLib`.

#### Android

* In Eclipse, select `File` -> `Import`
* Chose `Android` > `Existing Android Code Into Workspace`.
* Import from the path you just created with `mca`.
    * You should expect to have two projects to import, one of which is `*-CordovaLib`
* You will need to create a Run Configuration (as with all Java applications).  You _usually_ get prompted for this the first time automatically.
* You will need to manage your devices/emulators the first time as well.

### Step 3: Making changes to your App

Your HTML, CSS and JS files live within the `www` directory.

_Every time_ you change them, you _must_ run `mca prepare` from the root of your project.  Otherwise, those changes will not be reflected when running your app.

### Step 4: Icons, splash screen, settings, etc

[Coming soon]

## Experiencing Hiccups?

Please [reach out to us](mailto:mobile-chrome-apps@googlegroups.com).

## Done?

Read the [API Status document](APIStatus.md).
