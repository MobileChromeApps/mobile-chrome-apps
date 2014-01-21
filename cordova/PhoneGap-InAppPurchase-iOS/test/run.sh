#!/bin/sh

TEST_VERSION="3.1"
TEST_NAME="v31"

PLUGIN_URL="git://github.com/j3k0/PhoneGap-InAppPurchase-iOS.git"
# PLUGIN_URL="http://localhost/git/PhoneGap-InAppPurchase-iOS.git"

BUNDLE_ID="$1"
IAP_ID="$2"

DIR=platforms/ios/TestIAP$TEST_NAME/Plugins/com.phonegap.plugins.inapppurchase
WWW=platforms/ios/www/plugins/com.phonegap.plugins.inapppurchase
PROJ=platforms/ios/TestIAP${TEST_NAME}.xcodeproj/project.pbxproj

if [ "x$IAP_ID" = "x" ] || [ "x$1" = "x--help" ]; then
    echo
    echo "usage: $0 <bundle_id> <iap_id>"
    echo
    echo "This will generate a phonegap project using PhoneGap $TEST_VERSION (required)."
    echo "If plugin install is successful, you can test your IAP as follow:"
    echo " - if your device is logged-in a production iTunes account, go unlog (in device's settings)"
    echo " - open ./$TEST_NAME-build/platforms/ios/TestIAP${TEST_NAME}.xcodeproj"
    echo " - compile and run ON A DEVICE"
    echo " - the description of the IAP should appear after a while."
    echo " - click on the price to purchase, confirmation should appear on the console."
    echo " - click restore and check the console that it also worked."
    echo
    echo "example:"
    echo "    \$ $0 cc.fovea.babygoo babygooinapp1"
    echo
    exit 1
fi

# Check PhoneGap version
V=`phonegap version`
MAJOR=`echo $V | cut -d. -f1`
MINOR=`echo $V | cut -d. -f2`
if [ "x$MAJOR.$MINOR" != "x$TEST_VERSION" ]; then
    echo "This test is validated with PhoneGap $TEST_VERSION only (you are running $MAJOR.$MINOR)."
    exit 1
fi

# Clean things
cd `dirname $0`
rm -fr $TEST_NAME-build

# Create a project
phonegap create $TEST_NAME-build -n TestIAP$TEST_NAME -i cc.fovea.babygoo

cp $TEST_NAME-src/css/* $TEST_NAME-build/www/css/
cp $TEST_NAME-src/js/* $TEST_NAME-build/www/js/
cp $TEST_NAME-src/index.html $TEST_NAME-build/www/
sed -i "" "s/babygooinapp1/$IAP_ID/g" $TEST_NAME-build/www/js/iap.js

cd $TEST_NAME-build

# Add our plugin
phonegap local plugin add "$PLUGIN_URL" || exit 1
cp ../../src/ios/*.[hm] plugins/com.phonegap.plugins.inapppurchase/src/ios/
cp ../../InAppPurchase.js plugins/com.phonegap.plugins.inapppurchase/

# Add console debug
phonegap local plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-console.git || exit 1

# Compile for iOS
phonegap local build ios || exit 1

# Check existance of the plugins files
function hasFile() {
    if test -e "$1"; then
       echo "File $1 installed."
    else
       echo "ERROR: File $1 is missing."
       EXIT=1
    fi
}

hasFile "$DIR/InAppPurchase.m"
hasFile "$DIR/InAppPurchase.h"
hasFile "$DIR/SKProduct+LocalizedPrice.h"
hasFile "$DIR/SKProduct+LocalizedPrice.m"
hasFile "$WWW/InAppPurchase.js"

if grep StoreKit.framework "$PROJ" > /dev/null; then
    echo "StoreKit framework added."
else
    echo "ERROR: StoreKit framework missing."
    EXIT=1
fi

if [ "x$EXIT" != "x1" ]; then echo "Great! Everything looks good."; fi
exit $EXIT
