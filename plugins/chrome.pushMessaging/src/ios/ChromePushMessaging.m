
#import "ChromePushMessaging.h"

@implementation ChromePushMessaging

@synthesize notificationMessage;

@synthesize callbackId;
@synthesize notificationCallbackId;
@synthesize callback;

NSMutableDictionary *pendingMessages;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    return self;
}

- (void) getRegistrationId:(CDVInvokedUrlCommand *)command; {
    self.callbackId = command.callbackId;
    [self successWithMessage:@"setup"];
}


- (void)unregister:(CDVInvokedUrlCommand *)command; {
    self.callbackId = command.callbackId;

    [[UIApplication sharedApplication] unregisterForRemoteNotifications];
    [self successWithMessage:@"unregistered"];
}

- (void)fireStartupMessages:(CDVInvokedUrlCommand *)command; {
    self.callbackId = command.callbackId;

    UIRemoteNotificationType notificationTypes = UIRemoteNotificationTypeBadge | UIRemoteNotificationTypeSound | UIRemoteNotificationTypeAlert;

    [self.commandDelegate runInBackground:^{
        [[UIApplication sharedApplication] registerForRemoteNotificationTypes:notificationTypes];

        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];

    if (notificationMessage)            // if there is a pending startup notification
        [self notificationReceived];    // go ahead and process it
}

- (void)didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {

  NSString *token = [[[[deviceToken description] stringByReplacingOccurrencesOfString:@"<"withString:@""]
                      stringByReplacingOccurrencesOfString:@">" withString:@""]
                     stringByReplacingOccurrencesOfString: @" " withString: @""];
          NSLog(@"Register Msg: %@", token);
  [self successWithMessage:token];
}

- (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
    [self failWithMessage:@"" withError:error];
}

- (void)notificationReceived {
    NSLog(@"Notification received");

    if (notificationMessage && self.callback) {
        NSMutableString *jsonStr = [NSMutableString stringWithString:@"{"];

        [self parseDictionary:notificationMessage intoJSON:jsonStr];
        [jsonStr appendFormat:@"foreground:'%d',", 1];
        [jsonStr appendString:@"}"];

        NSLog(@"Msg: %@", jsonStr);

        [self.webView stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"chrome.pushMessaging.onMessage.fire({subchannelId:0, payload:'%@'})", jsonStr]];

      self.notificationMessage = nil;
    }
}

// reentrant method to drill down and surface all sub-dictionaries' key/value pairs into the top level json
- (void)parseDictionary:(NSDictionary *)inDictionary intoJSON:(NSMutableString *)jsonString {
    NSArray *keys = [inDictionary allKeys];
    NSString *key;

    for (key in keys) {
        id thisObject = [inDictionary objectForKey:key];

        if ([thisObject isKindOfClass:[NSDictionary class]])
            [self parseDictionary:thisObject intoJSON:jsonString];
        else
            [jsonString appendFormat:@"%@:'%@',", key, [inDictionary objectForKey:key]];
    }
}


- (void)successWithMessage:(NSString *)message {
    CDVPluginResult *commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:message];

    [self.commandDelegate sendPluginResult:commandResult callbackId:self.callbackId];
}

- (void)failWithMessage:(NSString *)message withError:(NSError *)error {
    NSString *errorMessage = (error) ? [NSString stringWithFormat:@"%@ - %@", message, [error localizedDescription]] : message;
    CDVPluginResult *commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:errorMessage];

    [self.commandDelegate sendPluginResult:commandResult callbackId:self.callbackId];
}


@end
