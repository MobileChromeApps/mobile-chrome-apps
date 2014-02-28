// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//

#import "AppDelegate.h"

@interface AppDelegate (notification)
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken;
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error;
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo;
- (void)applicationDidBecomeActive:(UIApplication *)application;
- (id) getPluginInstance:(NSString*)className;

@property (nonatomic, retain) NSDictionary	*launchNotification;

@end
