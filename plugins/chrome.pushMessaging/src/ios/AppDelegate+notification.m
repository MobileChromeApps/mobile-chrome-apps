// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// inspired by previous work from Urban Airship and Robert Easterday 

#import "AppDelegate+notification.h"
#import "ChromePushMessaging.h"
#import <objc/runtime.h>

static char launchNotificationKey;

@implementation AppDelegate (notification)

- (id) getPluginInstance:(NSString*)className
{
	return [self.viewController getCommandInstance:className];
}

// Overriding a method from within a category is unsafe because
// there might be other extensions and you cannot guarantee load order.
// Instead we will use method swizzling.
// This is set up in the load call which is called before init.
+ (void)load
{
    Method original, swizzled;
    
    original = class_getInstanceMethod(self, @selector(init));
    swizzled = class_getInstanceMethod(self, @selector(swizzled_init));
    method_exchangeImplementations(original, swizzled);
}

- (AppDelegate *)swizzled_init
{
	[[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(createNotificationChecker:)
               name:@"UIApplicationDidFinishLaunchingNotification" object:nil];
	
	// This calls the original init method in AppDelegate since the method name references have been swapped.
	return [self swizzled_init];
}

// This will be called immediately after application:didFinishLaunchingWithOptions.
// If the application was started byt responding to a message alert, the message
// is in the launch info
- (void)createNotificationChecker:(NSNotification *)notification
{
  if (notification) {
     NSDictionary *launchOptions = [notification userInfo];
     if (launchOptions) {
       	self.launchNotification = [launchOptions objectForKey: @"UIApplicationLaunchOptionsRemoteNotificationKey"];
     }
  }
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
    ChromePushMessaging *pushHandler = [self getPluginInstance:@"ChromePushMessaging"];
    [pushHandler didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
    ChromePushMessaging *pushHandler = [self getPluginInstance:@"ChromePushMessaging"];
    [pushHandler didFailToRegisterForRemoteNotificationsWithError:error];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo {
    
    UIApplicationState appState = UIApplicationStateActive;
    if ([application respondsToSelector:@selector(applicationState)]) {
        appState = application.applicationState;
    }
    
    if (appState == UIApplicationStateActive) {
        ChromePushMessaging *pushHandler = [self getPluginInstance:@"ChromePushMessaging"];
        pushHandler.notificationMessage = userInfo;
        [pushHandler notificationReceived];
    } else {
        // this will get noticed later when the app is launched
        self.launchNotification = userInfo;
    }
}

- (void)applicationDidBecomeActive:(UIApplication *)application {

    if (![self.viewController.webView isLoading] && self.launchNotification) {
        ChromePushMessaging *pushHandler = [self getPluginInstance:@"ChromePushMessaging"];
		
        pushHandler.notificationMessage = self.launchNotification;
        self.launchNotification = nil;
        [pushHandler performSelectorOnMainThread:@selector(notificationReceived) withObject:pushHandler waitUntilDone:NO];
    }
}

// Apple decided that its too likely to get overload collisions, so defining instance variables
// in a category extension isnt supported. You can do it with Associative Reference
// 

- (NSMutableArray *)launchNotification
{
   return objc_getAssociatedObject(self, &launchNotificationKey);
}

- (void)setLaunchNotification:(NSDictionary *)aDictionary
{
    objc_setAssociatedObject(self, &launchNotificationKey, aDictionary, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (void)dealloc
{
    self.launchNotification	= nil;
}

@end
