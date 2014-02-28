// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromePushMessaging.h"

@implementation ChromePushMessaging

@synthesize notificationMessage;

@synthesize callbackId;
@synthesize notificationCallbackId;
@synthesize callback;
@synthesize registrationToken;


NSMutableDictionary *pendingMessages;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    return self;
}

- (void) getRegistrationId:(CDVInvokedUrlCommand *)command; {
    self.callbackId = command.callbackId;
    CDVPluginResult *commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Not Registered"];
    if(registrationToken) {
       commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:registrationToken];
    }
    [self.commandDelegate sendPluginResult:commandResult callbackId:self.callbackId];
}

- (void)fireStartupMessages:(CDVInvokedUrlCommand *)command; {
    self.callbackId = command.callbackId;

    UIRemoteNotificationType notificationTypes = UIRemoteNotificationTypeBadge | UIRemoteNotificationTypeSound | UIRemoteNotificationTypeAlert;

    [self.commandDelegate runInBackground:^{
        [[UIApplication sharedApplication] registerForRemoteNotificationTypes:notificationTypes];

        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];

    // check if there is a pending message (probably the message that started the app)
    // if there is, process it.
    // note that there can only be one. If you got several, only the last one is still around.
    if (notificationMessage) [self notificationReceived];
}

- (void)didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {

  NSString *token = [[[[deviceToken description] stringByReplacingOccurrencesOfString:@"<"withString:@""]
                      stringByReplacingOccurrencesOfString:@">" withString:@""]
                     stringByReplacingOccurrencesOfString: @" " withString: @""];
          NSLog(@"Register Msg: %@", token);

    // this token needs to be kept and returned to the application so it can be used to send message here
    registrationToken = token;
    CDVPluginResult *commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:token];
    [self.commandDelegate sendPluginResult:commandResult callbackId:self.callbackId];
}

- (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
    // something bad happened. No messaging is going to happen

    NSString *message = @"Registration failed";
    NSString *errorMessage = (error) ? [NSString stringWithFormat:@"%@ - %@", message, [error localizedDescription]] : message;
    CDVPluginResult *commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:errorMessage];
    [self.commandDelegate sendPluginResult:commandResult callbackId:self.callbackId];
}

- (void)notificationReceived {

    if (notificationMessage ) {
       NSError *error;
       NSData *jsonData = [NSJSONSerialization dataWithJSONObject:notificationMessage options:0 error:&error];
       NSString *jsonStr = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];

       NSLog(@"Msg: %@", jsonStr);
       [self writeJavascript: [NSString stringWithFormat:@"chrome.pushMessaging.onMessage.fire({subchannelId:0, payload:'%@'})", jsonStr]];

       self.notificationMessage = nil;
    }
}


@end
