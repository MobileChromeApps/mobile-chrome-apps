
#import <Foundation/Foundation.h>
#import <Cordova/CDV.h>
#import <Cordova/CDVPlugin.h>

@interface ChromePushMessaging : CDVPlugin
{
    NSDictionary *notificationMessage;
    NSString *notificationCallbackId;
    NSString *callback;
}

@property (nonatomic, copy) NSString *callbackId;
@property (nonatomic, copy) NSString *notificationCallbackId;
@property (nonatomic, copy) NSString *callback;
@property (nonatomic, copy) NSString *registrationToken;

@property (nonatomic, strong) NSDictionary *notificationMessage;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView;
- (void) getRegistrationId:(CDVInvokedUrlCommand *)command;

- (void) fireStartupMessages:(CDVInvokedUrlCommand *)command;
- (void)didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken;
- (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error;

- (void)setNotificationMessage:(NSDictionary *)notification;
- (void)notificationReceived;

@end
