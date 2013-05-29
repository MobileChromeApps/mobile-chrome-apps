# Getting Started with Mobile Chrome Apps

Note: If you haven't read through the installation guide, go do that now. There are some dependencies, such as a native development environment and node.js, which you will need to satisfy before you can build mobile Chrome apps.

# Developer Guide

## 1. Creating your first Mobile Chrome App

Now that you have installed the Mobile Chrome Apps framework, lets use it to create your first App.

### Step 1: Create a Project

    path/to/mca-create.js com.yourcompanyname.YourAppName

Note: `mobile-chrome-apps` directory is a self-updating git repository, so its easier not to create your projects inside that directory

### Step 2: Open the Project

The easiest way to run the project is through an IDE.

* On iOS:
    * Open the project file, which is located at `MyAppName/platforms/ios/MyAppName.xcodeproj`.
* On Android, there are a couple more (straight-forward) steps:
    * First, import the project into Eclipse by selecting `Import` from the Package Explorer context menu.
    * In the resulting dialog, choose `Android` -> `Existing Android Code Into Workspace` and click `Next >`.
    * Click `Browse...`, navigate to `MyAppName/platforms/android`, click `Open`, and then `Finish`.
    * Finally, add the Google Play Services library as outlined [here](http://developer.android.com/google/play-services/setup.html).

### Step 3: Build and run

Right away, you should be able to build your new app, and run it in the iOS simulator or on an Android emulator

## 2. Making Changes

Your HTML, CSS and JS files live within the `app/www` directory. Every time you change them, you must run the `mca-update` script located in the root of your project. This will copy your application files into the various platform directories, where they can be built by XCode or Eclipse.


Try to change some of the markup in `app/www/index.html`, run `mca-update`, and rebuild the application.

## 4. Chrome Apps APIs

The complete reference guide for building Chrome Packaged Apps can be found online at http://developer.chrome.com/apps/about_apps.html

See our `Status` document, however, for a list of APIs that are currently supported on mobile, and for any differences between the mobile and desktop behaviours.

## 5. Platform Differences (merges)

[Coming soon]

## 6. Polish

[Coming soon]

### 6.1 Icons

[Coming soon]

### 6.2 Application Name

[Coming soon]
