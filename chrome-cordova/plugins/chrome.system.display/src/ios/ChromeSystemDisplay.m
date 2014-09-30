// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeSystemDisplay.h"
#import <UIKit/UIScreen.h>
    
#if CHROME_SYSTEM_DISPLAY_VERBOSE_LOGGING
#define VERBOSE_LOG NSLog
#else
#define VERBOSE_LOG(args...) do {} while (false)
#endif

@implementation ChromeSystemDisplay

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    return self;
}

- (NSDictionary*) buildBoundsInfo:(CGRect)bounds scale:(CGFloat)scale
{
    NSMutableDictionary* boundsInfo = [NSMutableDictionary dictionary];

    // Convert screen resolution from points to pixels
    CGSize screenSize = CGSizeMake(bounds.size.width * scale, bounds.size.height * scale);

    [boundsInfo setValue:@(0) forKey:@"left"];
    [boundsInfo setValue:@(0) forKey:@"top"];
    [boundsInfo setValue:@(screenSize.width) forKey:@"width"];
    [boundsInfo setValue:@(screenSize.height) forKey:@"height"];

    return boundsInfo;
}

- (NSNumber*) getRotation:(UIScreen*)display
{
    //TODO: There should be a way to figure out the orientation, and thus the rotation
    return 0;
}

- (NSDictionary*) getBounds:(UIScreen*)display
{
    return [self buildBoundsInfo:[display bounds] scale:[display scale]];
}

- (NSDictionary*) getOverscan:(UIScreen*)display
{
    NSMutableDictionary* overscan = [NSMutableDictionary dictionary];
    
    [overscan setValue:@(0) forKey:@"left"];
    [overscan setValue:@(0) forKey:@"top"];
    [overscan setValue:@(0) forKey:@"right"];
    [overscan setValue:@(0) forKey:@"bottom"];
    
    return overscan;
}

- (NSNumber*) getDpiX:(UIScreen*)display
{
    float scale = [display scale];

    return [NSNumber numberWithFloat: scale * 160];
}

- (NSNumber*) getDpiY:(UIScreen*)display
{
    float scale = [display scale];
    
    return [NSNumber numberWithFloat: scale * 160];
}

- (NSDictionary*) getWorkArea:(UIScreen*)display
{
    return [self buildBoundsInfo:[display applicationFrame] scale:[display scale]];
}

- (NSDictionary*) getDisplayInfo:(UIScreen*)display displayIndex:(NSInteger)index mainDisplay:(UIScreen*)mainDisplay
{
    NSMutableDictionary* displayInfo = [NSMutableDictionary dictionary];

    BOOL isPrimary = NO;
    NSString* name = @"[unnamed]";
    
    if (display == mainDisplay) {
        isPrimary = YES;
        name = @"Built-in Screen";
    }

    [displayInfo setValue:[@(index) stringValue] forKey:@"id"];
    [displayInfo setValue:name forKey:@"name"];
    [displayInfo setValue:[NSNumber numberWithBool:isPrimary] forKey:@"isPrimary"];
    [displayInfo setValue:[self getDpiX:display] forKey:@"dpiX"];
    [displayInfo setValue:[self getDpiY:display] forKey:@"dpiY"];
    [displayInfo setValue:[self getRotation:display] forKey:@"rotation"];
    [displayInfo setObject:[self getBounds:display] forKey:@"bounds"];
    [displayInfo setObject:[self getOverscan:display] forKey:@"overscan"];
    [displayInfo setObject:[self getWorkArea:display] forKey:@"workArea"];

    return displayInfo;
}

- (void)getInfo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;

        @try {

            NSMutableArray* displays = [NSMutableArray array];
        
            UIScreen* mainScreen = [UIScreen mainScreen];
            NSArray* screens = [UIScreen screens];
            int i = 0;
            for (UIScreen* screen in screens) {
                [displays addObject:[self getDisplayInfo:screen displayIndex:i mainDisplay:mainScreen]];
                i++;
            }

            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:displays];
        } @catch (NSException* exception) {
            VERBOSE_LOG(@"%@ - %@", @"Error occured while getting display info", [exception debugDescription]);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Could not get display info"];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];    
}

@end
