//
//  InAppPurchase.h
//  beetight
//
//  Created by Matt Kane on 20/02/2011.
//  Copyright 2011 Matt Kane. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <StoreKit/StoreKit.h>

#import <Cordova/CDVPlugin.h>
#import <Cordova/NSData+Base64.h>

#import "SKProduct+LocalizedPrice.h"

@interface InAppPurchase : CDVPlugin <SKPaymentTransactionObserver> {
    NSMutableDictionary *list;
    NSMutableDictionary *retainer;
    NSMutableDictionary *unfinishedTransactions;
}
@property (nonatomic,retain) NSMutableDictionary *list;
@property (nonatomic,retain) NSMutableDictionary *retainer;

- (void) setup: (CDVInvokedUrlCommand*)command;
- (void) load: (CDVInvokedUrlCommand*)command;
- (void) purchase: (CDVInvokedUrlCommand*)command;
- (void) appStoreReceipt: (CDVInvokedUrlCommand*)command;

- (void) paymentQueue:(SKPaymentQueue *)queue updatedTransactions:(NSArray *)transactions;
- (void) paymentQueue:(SKPaymentQueue *)queue restoreCompletedTransactionsFailedWithError:(NSError *)error;
- (void) paymentQueueRestoreCompletedTransactionsFinished:(SKPaymentQueue *)queue;

- (void) debug: (CDVInvokedUrlCommand*)command;
- (void) noAutoFinish: (CDVInvokedUrlCommand*)command;
- (void) finishTransaction: (CDVInvokedUrlCommand*)command;

@end

@interface BatchProductsRequestDelegate : NSObject <SKProductsRequestDelegate> {
	InAppPurchase*        plugin;
    CDVInvokedUrlCommand* command;
}

@property (nonatomic,retain) InAppPurchase* plugin;
@property (nonatomic,retain) CDVInvokedUrlCommand* command;

@end;
