/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

#define Log(fmt, ...) NSLog((@"%d: %s " fmt), __LINE__, __PRETTY_FUNCTION__, ##__VA_ARGS__);

#import "WebNotifications.h"
#import "MainViewController.h"

@implementation WebNotifications

@synthesize activeNotifications;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super init];
    if (self) {
        self.activeNotifications = [NSMutableArray array];
    }
    return self;
}

- (void)createNotification:(CDVInvokedUrlCommand*)command
{
    NSDictionary* options = [command.arguments objectAtIndex:0];

    // w3c options:
	NSString *title = [options objectForKey:@"title"];
	NSString *body = [options objectForKey:@"body"];
	NSString *tag = [options objectForKey:@"tag"];
    //NSString *iconUrl = [options objectForKey:@"iconUrl"]; // Not supported
    
    // cordova option extensions:
    NSUInteger delay = [[options objectForKey:@"delay"] unsignedIntegerValue];
    NSString *soundUrl = [options objectForKey:@"soundUrl"];
    NSInteger badgeNumber = [[options objectForKey:@"badgeNumber"] intValue];
    
    Log(@"addNotification title: %@  body: %@  tag: %@  delay: %u  badge: %u", title, body, tag, delay, badgeNumber);
    
    //NSString *action = [options objectForKey:@"action"];
    //bool hasAction = ([[options objectForKey:@"hasAction"] intValue] == 1) ? YES : NO;
    //alertAction
    
	UILocalNotification *notif = [[UILocalNotification alloc] init];
	notif.alertBody = [NSString stringWithFormat:@"[%@] %@: %@", tag, title, body];
    notif.timeZone = [NSTimeZone defaultTimeZone];
    
    notif.soundName = soundUrl;
    notif.applicationIconBadgeNumber = badgeNumber;
	
	NSDictionary *userDict = [NSDictionary dictionaryWithObjectsAndKeys:title,@"title",body,@"body",tag,@"tag",nil];
    notif.userInfo = userDict;
	
    if (delay != 0) {
        notif.fireDate = [[NSDate date] addTimeInterval:delay];
        //notif.repeatInterval = [[repeatDict objectForKey: repeat] intValue];
        
        [[UIApplication sharedApplication] scheduleLocalNotification:notif];
    } else {
        [[UIApplication sharedApplication] presentLocalNotificationNow:notif];
    }
    
    [self.activeNotifications addObject:notif];
}

- (void)closeNotification:(CDVInvokedUrlCommand*)command
{
//    command.callbackId;
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString *tag = [options objectForKey:@"tag"];

    NSArray *notifications = [[UIApplication sharedApplication] scheduledLocalNotifications];
    for (UILocalNotification *notification in notifications) {
        if ([[notification.userInfo objectForKey:@"tag"] isEqualToString:tag]) {
            Log(@"Cancelling notification with tag: %@", tag);
            [[UIApplication sharedApplication] cancelLocalNotification:notification];
            [self.activeNotifications removeObject:notification];
            [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
        }
    }
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsInt:0] callbackId:command.callbackId];
}

- (void)clickNofification:(NSString*)tag {
    NSString *jsCallBack;
    
    jsCallBack = [NSString stringWithFormat:@"window.Notification.callOnclickByTag('%@')", tag];
    [((CDVViewController*)self.viewController).webView stringByEvaluatingJavaScriptFromString:jsCallBack];
    
    NSArray *scheduledNotifications = [[UIApplication sharedApplication] scheduledLocalNotifications];
    NSMutableArray *toDiscard = [NSMutableArray array];
    for (UILocalNotification *notification in self.activeNotifications) {
        if (![scheduledNotifications containsObject:notification]) {
            // This notification is active, but no longer scheduled, so it must be displayed
            jsCallBack = [NSString stringWithFormat:@"window.Notification.callOncloseByTag('%@')", [notification.userInfo objectForKey:@"tag"]];
            [((CDVViewController*)self.viewController).webView stringByEvaluatingJavaScriptFromString:jsCallBack];
            [toDiscard addObject:notification];
        }
    }
    [self.activeNotifications removeObjectsInArray:toDiscard];
}

/*
- (void)cancelAllNotifications:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
	[[UIApplication sharedApplication] cancelAllLocalNotifications];
}
*/

@end
