## Chrome Mobile Spec Suite ##

These specs are designed to run inside the mobile device that implements it - _it will fail in the DESKTOP browser_.
The Chrome API tests should work inside a Chrome packaged app.

### How to create an iOS spec project ###
Run these commands:

    incubator-cordova-ios/bin/create --shared ChromeSpecIos com.google.chromespecios ChromeSpec
    cd ChromeSpecIos
    rm -r www
    open ChromeSpecIos.xcodeproj

Change ChromeSpec/Classes/AppDelegate.m:

    self.viewController.useSplashScreen = NO;
    self.viewController.wwwFolderName = @"spec";
    self.viewController.startPage = @"chromeapp.html";

Change the Build Phases:

1. Click on the ChromeSpec project entry on the left-nav
1. Click the ChromeSpec target
1. Click the "Build Phases" tab
1. Change the "touch www" phase to:
    rm -rf "$BUILT_PRODUCTS_DIR/$FULL_PRODUCT_NAME/spec"
    cp -RL ../../chrome-cordova/spec "$BUILT_PRODUCTS_DIR/$FULL_PRODUCT_NAME/spec"
