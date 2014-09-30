// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIScreen.h>
    
#if CHROME_SYSTEM_DISPLAY_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@interface ChromeSystemDisplay : CDVPlugin

- (void)getInfo:(CDVInvokedUrlCommand*)command;

@end

@implementation ChromeSystemDisplay

- (NSDictionary*) buildBoundsInfo:(CGRect)bounds scale:(CGFloat)scale
{
    // Convert screen resolution from points to pixels
    CGSize screenSize = CGSizeMake(bounds.size.width * scale, bounds.size.height * scale);

    return @{
        @"left": @(0),
        @"top": @(0),
        @"width": @(screenSize.width),
        @"height": @(screenSize.height)
    };
}

- (NSNumber*) rotationForDisplay:(UIScreen*)display
{
    //TODO: There should be a way to figure out the orientation, and thus the rotation
    return @(0);
}

- (NSDictionary*) boundsForDisplay:(UIScreen*)display
{
    return [self buildBoundsInfo:[display bounds] scale:[display scale]];
}

- (NSDictionary*) overscanForDisplay:(UIScreen*)display
{
    return @{
        @"left": @(0),
        @"top": @(0),
        @"right": @(0),
        @"bottom": @(0)
    };
}

- (NSNumber*) dpiXForDisplay:(UIScreen*)display
{
    float scale = [display scale];

    // Using an approximation (1 unscaled point = 1/160th of an inch), as per:
    // http://stackoverflow.com/questions/3860305/get-ppi-of-iphone-ipad-ipod-touch-at-runtime/7922666#7922666
    return [NSNumber numberWithFloat: scale * 160];
}

- (NSNumber*) dpiYForDisplay:(UIScreen*)display
{
    float scale = [display scale];
    
    // Using an approximation (1 unscaled point = 1/160th of an inch), as per:
    // http://stackoverflow.com/questions/3860305/get-ppi-of-iphone-ipad-ipod-touch-at-runtime/7922666#7922666
    return [NSNumber numberWithFloat: scale * 160];
}

- (NSDictionary*) workAreaForDisplay:(UIScreen*)display
{
    return [self buildBoundsInfo:[display applicationFrame] scale:[display scale]];
}

- (NSDictionary*) getDisplayInfo:(UIScreen*)display displayIndex:(NSInteger)index mainDisplay:(UIScreen*)mainDisplay
{
    BOOL isPrimary = NO;
    NSString* name = @"[unnamed]";
    
    if (display == mainDisplay) {
        isPrimary = YES;
        name = @"Built-in Screen";
    }

    return @{
        @"id": [@(index) stringValue],
        @"name": name,
        @"isPrimary": [NSNumber numberWithBool:isPrimary],
        @"dpiX": [self dpiXForDisplay:display],
        @"dpiY": [self dpiYForDisplay:display],
        @"rotation": [self rotationForDisplay:display],
        @"bounds": [self boundsForDisplay:display],
        @"overscan": [self overscanForDisplay:display],
        @"workArea": [self workAreaForDisplay:display]
    };
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        NSMutableArray* displays = [NSMutableArray array];
    
        UIScreen* mainScreen = [UIScreen mainScreen];
        NSArray* screens = [UIScreen screens];
        int i = 0;
        for (UIScreen* screen in screens) {
            [displays addObject:[self getDisplayInfo:screen displayIndex:i mainDisplay:mainScreen]];
            i++;
        }

        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:displays];

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end
