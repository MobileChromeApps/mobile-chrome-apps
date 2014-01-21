//
//  InAppPurchase.m
//
//  Created by Matt Kane on 20/02/2011.
//  Copyright (c) Matt Kane 2011. All rights reserved.
//  Copyright (c) Jean-Christophe Hoelt 2013
//

#import "InAppPurchase.h"
#include <stdio.h>
#include <stdlib.h>

// Help create NSNull objects for nil items (since neither NSArray nor NSDictionary can store nil values).
#define NILABLE(obj) ((obj) != nil ? (NSObject *)(obj) : (NSObject *)[NSNull null])

static BOOL g_debugEnabled = NO;
static BOOL g_autoFinishEnabled = YES;

#define DLog(fmt, ...) { \
    if (g_debugEnabled) \
        NSLog((@"InAppPurchase[objc]: " fmt), ##__VA_ARGS__); \
}
/*

const static char* b64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/" ;

// maps A=>0,B=>1..
const static unsigned char unb64[]={
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //10 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //20 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //30 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //40 
  0,   0,   0,  62,   0,   0,   0,  63,  52,  53, //50 
 54,  55,  56,  57,  58,  59,  60,  61,   0,   0, //60 
  0,   0,   0,   0,   0,   0,   1,   2,   3,   4, //70 
  5,   6,   7,   8,   9,  10,  11,  12,  13,  14, //80 
 15,  16,  17,  18,  19,  20,  21,  22,  23,  24, //90 
 25,   0,   0,   0,   0,   0,   0,  26,  27,  28, //100 
 29,  30,  31,  32,  33,  34,  35,  36,  37,  38, //110 
 39,  40,  41,  42,  43,  44,  45,  46,  47,  48, //120 
 49,  50,  51,   0,   0,   0,   0,   0,   0,   0, //130 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //140 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //150 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //160 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //170 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //180 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //190 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //200 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //210 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //220 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //230 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //240 
  0,   0,   0,   0,   0,   0,   0,   0,   0,   0, //250 
  0,   0,   0,   0,   0,   0, 
}; // This array has 255 elements

// Converts binary data of length=len to base64 characters.
// Length of the resultant string is stored in flen
// (you must pass pointer flen).
char* base64(const void* binaryData, int len, int *flen)
{
  const unsigned char* bin = (const unsigned char*) binaryData ;
  char* res ;
  
  int rc = 0 ; // result counter
  int byteNo ; // I need this after the loop
  
  int modulusLen = len % 3 ;
  int pad = ((modulusLen&1)<<1) + ((modulusLen&2)>>1) ; // 2 gives 1 and 1 gives 2, but 0 gives 0.
  
  *flen = 4*(len + pad)/3 ;
  res = (char*) malloc( *flen + 1 ) ; // and one for the null
  if( !res )
  {
    puts( "ERROR: base64 could not allocate enough memory." ) ;
    puts( "I must stop because I could not get enough" ) ;
    return 0;
  }
  
  for( byteNo = 0 ; byteNo <= len-3 ; byteNo+=3 )
  {
    unsigned char BYTE0=bin[byteNo];
    unsigned char BYTE1=bin[byteNo+1];
    unsigned char BYTE2=bin[byteNo+2];
    res[rc++]  = b64[ BYTE0 >> 2 ] ;
    res[rc++]  = b64[ ((0x3&BYTE0)<<4) + (BYTE1 >> 4) ] ;
    res[rc++]  = b64[ ((0x0f&BYTE1)<<2) + (BYTE2>>6) ] ;
    res[rc++]  = b64[ 0x3f&BYTE2 ] ;
  }
  
  if( pad==2 )
  {
    res[rc++] = b64[ bin[byteNo] >> 2 ] ;
    res[rc++] = b64[ (0x3&bin[byteNo])<<4 ] ;
    res[rc++] = '=';
    res[rc++] = '=';
  }
  else if( pad==1 )
  {
    res[rc++]  = b64[ bin[byteNo] >> 2 ] ;
    res[rc++]  = b64[ ((0x3&bin[byteNo])<<4)   +   (bin[byteNo+1] >> 4) ] ;
    res[rc++]  = b64[ (0x0f&bin[byteNo+1])<<2 ] ;
    res[rc++] = '=';
  }
  
  res[rc] = 0; // NULL TERMINATOR! ;)
  return res ;
}

unsigned char* unbase64( const char* ascii, int len, int *flen )
{
  const unsigned char *safeAsciiPtr = (const unsigned char*)ascii ;
  unsigned char *bin ;
  int cb=0;
  int charNo;
  int pad = 0 ;

  if( len < 2 ) { // 2 accesses below would be OOB.
    // catch empty string, return NULL as result.
    puts( "ERROR: You passed an invalid base64 string (too short). You get NULL back." ) ;
    *flen=0;
    return 0 ;
  }
  if( safeAsciiPtr[ len-1 ]=='=' )  ++pad ;
  if( safeAsciiPtr[ len-2 ]=='=' )  ++pad ;
  
  *flen = 3*len/4 - pad ;
  bin = (unsigned char*)malloc( *flen ) ;
  if( !bin )
  {
    puts( "ERROR: unbase64 could not allocate enough memory." ) ;
    puts( "I must stop because I could not get enough" ) ;
    return 0;
  }
  
  for( charNo=0; charNo <= len - 4 - pad ; charNo+=4 )
  {
    int A=unb64[safeAsciiPtr[charNo]];
    int B=unb64[safeAsciiPtr[charNo+1]];
    int C=unb64[safeAsciiPtr[charNo+2]];
    int D=unb64[safeAsciiPtr[charNo+3]];
    
    bin[cb++] = (A<<2) | (B>>4) ;
    bin[cb++] = (B<<4) | (C>>2) ;
    bin[cb++] = (C<<6) | (D) ;
  }
  
  if( pad==1 )
  {
    int A=unb64[safeAsciiPtr[charNo]];
    int B=unb64[safeAsciiPtr[charNo+1]];
    int C=unb64[safeAsciiPtr[charNo+2]];
    
    bin[cb++] = (A<<2) | (B>>4) ;
    bin[cb++] = (B<<4) | (C>>2) ;
  }
  else if( pad==2 )
  {
    int A=unb64[safeAsciiPtr[charNo]];
    int B=unb64[safeAsciiPtr[charNo+1]];
    
    bin[cb++] = (A<<2) | (B>>4) ;
  }
  
  return bin;
}
*/

// To avoid compilation warning, declare JSONKit and SBJson's
// category methods without including their header files.
@interface NSArray (StubsForSerializers)
- (NSString *)JSONString;
- (NSString *)JSONRepresentation;
@end

// Helper category method to choose which JSON serializer to use.
@interface NSArray (JSONSerialize)
- (NSString *)JSONSerialize;
@end

@implementation NSArray (JSONSerialize)
- (NSString *)JSONSerialize {
    return [self respondsToSelector:@selector(JSONString)] ? [self JSONString] : [self JSONRepresentation];
}
@end

@interface NSData (Base64)
- (NSString*)convertToBase64;
@end

@implementation NSData (Base64)
- (NSString*)convertToBase64 {
    const uint8_t* input = (const uint8_t*)[self bytes];
    NSInteger length = [self length];

    static char table[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    NSMutableData* data = [NSMutableData dataWithLength:((length + 2) / 3) * 4];
    uint8_t* output = (uint8_t*)data.mutableBytes;

    NSInteger i;
    for (i=0; i < length; i += 3) {
        NSInteger value = 0;
        NSInteger j;
        for (j = i; j < (i + 3); j++) {
            value <<= 8;

            if (j < length) {
                value |= (0xFF & input[j]);
            }
        }

        NSInteger theIndex = (i / 3) * 4;
        output[theIndex + 0] =                    table[(value >> 18) & 0x3F];
        output[theIndex + 1] =                    table[(value >> 12) & 0x3F];
        output[theIndex + 2] = (i + 1) < length ? table[(value >> 6)  & 0x3F] : '=';
        output[theIndex + 3] = (i + 2) < length ? table[(value >> 0)  & 0x3F] : '=';
    }

    NSString *ret = [[NSString alloc] initWithData:data encoding:NSASCIIStringEncoding];
#if ARC_DISABLED
    [ret autorelease];
#endif
    return ret;
}
@end

@implementation InAppPurchase
@synthesize list;
@synthesize retainer;

-(void) debug: (CDVInvokedUrlCommand*)command {
    g_debugEnabled = YES;
}

-(void) noAutoFinish: (CDVInvokedUrlCommand*)command {
    g_autoFinishEnabled = NO;
}

-(void) setup: (CDVInvokedUrlCommand*)command {
    CDVPluginResult* pluginResult = nil;
    self.list = [[NSMutableDictionary alloc] init];
    self.retainer = [[NSMutableDictionary alloc] init];
    unfinishedTransactions = [[NSMutableDictionary alloc] init];
    [[SKPaymentQueue defaultQueue] addTransactionObserver:self];
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@"InAppPurchase initialized"];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

/**
 * Request product data for the given productIds.
 * See js for further documentation.
 */
- (void) load: (CDVInvokedUrlCommand*)command
{
	DLog(@"Getting products data");

    NSArray *inArray = [command.arguments objectAtIndex:0];

    if ((unsigned long)[inArray count] == 0) {
        DLog(@"Empty array");
        NSArray *callbackArgs = [NSArray arrayWithObjects: nil, nil, nil];
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:callbackArgs];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }

    if (![[inArray objectAtIndex:0] isKindOfClass:[NSString class]]) {
        DLog(@"Not an array of NSString");
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid arguments"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }
    
    NSSet *productIdentifiers = [NSSet setWithArray:inArray];
    DLog(@"Set has %li elements", (unsigned long)[productIdentifiers count]);
    for (NSString *item in productIdentifiers) {
        DLog(@" - %@", item);
    }
    SKProductsRequest *productsRequest = [[SKProductsRequest alloc] initWithProductIdentifiers:productIdentifiers];

    BatchProductsRequestDelegate* delegate = [[BatchProductsRequestDelegate alloc] init];
    productsRequest.delegate = delegate;
    delegate.plugin  = self;
    delegate.command = command;

#if ARC_ENABLED
    self.retainer[@"productsRequest"] = productsRequest;
    self.retainer[@"productsRequestDelegate"] = delegate;
#else
    [delegate retain];
#endif

    DLog(@"Starting product request...");
    [productsRequest start];
    DLog(@"Product request started");
}

- (void) purchase: (CDVInvokedUrlCommand*)command
{
	DLog(@"About to do IAP");
    id identifier = [command.arguments objectAtIndex:0];
    id quantity =   [command.arguments objectAtIndex:1];

    SKMutablePayment *payment = [SKMutablePayment paymentWithProduct:[self.list objectForKey:identifier]];
    if ([quantity respondsToSelector:@selector(integerValue)]) {
        payment.quantity = [quantity integerValue];
    }
	[[SKPaymentQueue defaultQueue] addPayment:payment];
}

- (void) restoreCompletedTransactions: (CDVInvokedUrlCommand*)command
{
    [[SKPaymentQueue defaultQueue] restoreCompletedTransactions];
}

// SKPaymentTransactionObserver methods
// called when the transaction status is updated
//
- (void)paymentQueue:(SKPaymentQueue*)queue updatedTransactions:(NSArray*)transactions
{
	NSString *state, *error, *transactionIdentifier, *transactionReceipt, *productId;
	NSInteger errorCode;

    for (SKPaymentTransaction *transaction in transactions)
    {
		error = state = transactionIdentifier = transactionReceipt = productId = @"";
		errorCode = 0;
        DLog(@"Payment transaction updated:");

        switch (transaction.transactionState)
        {
			case SKPaymentTransactionStatePurchasing:
				DLog(@"Purchasing...");
				continue;

            case SKPaymentTransactionStatePurchased:
				state = @"PaymentTransactionStatePurchased";
				transactionIdentifier = transaction.transactionIdentifier;
				transactionReceipt = [[transaction transactionReceipt] base64EncodedString];
				productId = transaction.payment.productIdentifier;
                break;

			case SKPaymentTransactionStateFailed:
				state = @"PaymentTransactionStateFailed";
				error = transaction.error.localizedDescription;
				errorCode = transaction.error.code;
				DLog(@"Error %d %@", errorCode, error);
                break;

			case SKPaymentTransactionStateRestored:
				state = @"PaymentTransactionStateRestored";
				transactionIdentifier = transaction.originalTransaction.transactionIdentifier;
				transactionReceipt = [[transaction transactionReceipt] base64EncodedString];
				productId = transaction.originalTransaction.payment.productIdentifier;
                break;

            default:
				DLog(@"Invalid state");
                continue;
        }
		DLog(@"State: %@", state);
        NSArray *callbackArgs = [NSArray arrayWithObjects:
                                 NILABLE(state),
                                 [NSNumber numberWithInt:errorCode],
                                 NILABLE(error),
                                 NILABLE(transactionIdentifier),
                                 NILABLE(productId),
                                 NILABLE(transactionReceipt),
                                 nil];
		NSString *js = [NSString
            stringWithFormat:@"window.storekit.updatedTransactionCallback.apply(window.storekit, %@)",
            [callbackArgs JSONSerialize]];
		// DLog(@"js: %@", js);
        [self.commandDelegate evalJs:js];
        if (g_autoFinishEnabled) {
            [[SKPaymentQueue defaultQueue] finishTransaction:transaction];
            [self transactionFinished:transaction];
        }
        else {
            [unfinishedTransactions setObject:transaction forKey:transactionIdentifier];
        }
    }
}

- (void) transactionFinished: (SKPaymentTransaction*) transaction
{
    NSArray *callbackArgs = [NSArray arrayWithObjects:
                                NILABLE(@"PaymentTransactionStateFinished"),
                                0,
                                NILABLE(nil),
                                NILABLE(transaction.transactionIdentifier),
                                NILABLE(transaction.payment.productIdentifier),
                                NILABLE(nil),
                                nil];
    NSString *js = [NSString
      stringWithFormat:@"window.storekit.updatedTransactionCallback.apply(window.storekit, %@)",
      [callbackArgs JSONSerialize]];
    [self.commandDelegate evalJs:js];
}

- (void) finishTransaction: (CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult;
    NSString *identifier = (NSString*)[command.arguments objectAtIndex:0];
    SKPaymentTransaction *transaction = nil;

    if (identifier) {
        transaction = (SKPaymentTransaction*)[unfinishedTransactions objectForKey:identifier];
    }

    if (transaction) {
        DLog(@"Transaction %@ finished.", identifier);
        [[SKPaymentQueue defaultQueue] finishTransaction:transaction];
        [unfinishedTransactions removeObjectForKey:identifier];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self transactionFinished:transaction];
    }
    else {
        DLog(@"Cannot finish transaction %@.", identifier);
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Cannot finish transaction"];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)paymentQueue:(SKPaymentQueue *)queue restoreCompletedTransactionsFailedWithError:(NSError *)error
{
	NSString *js = [NSString stringWithFormat:
      @"window.storekit.restoreCompletedTransactionsFailed(%d)", error.code];
    [self.commandDelegate evalJs: js];
}

- (void)paymentQueueRestoreCompletedTransactionsFinished:(SKPaymentQueue *)queue
{
    NSString *js = @"window.storekit.restoreCompletedTransactionsFinished.apply(window.storekit)";
    [self.commandDelegate evalJs: js];
}

- (NSData *)appStoreReceipt
{
    NSURL *receiptURL = nil;
    NSBundle *bundle = [NSBundle mainBundle];
    if ([bundle respondsToSelector:@selector(appStoreReceiptURL)]) {
        // The general best practice of weak linking using the respondsToSelector: method
        // cannot be used here. Prior to iOS 7, the method was implemented as private SPI,
        // but that implementation called the doesNotRecognizeSelector: method.
        if (floor(NSFoundationVersionNumber) > NSFoundationVersionNumber_iOS_6_1) {
            receiptURL = [bundle performSelector:@selector(appStoreReceiptURL)];
        }
    }

    if (receiptURL != nil) {
        NSData *receiptData = [NSData dataWithContentsOfURL:receiptURL];
#if ARC_DISABLED
        [receiptData autorelease];
#endif
        return receiptData;
    }
    else {
        return nil;
    }
}
/*
I started to implement client side receipt validation. However, this requires the inclusion of OpenSSL into the source, which is probably behong what storekit plugin should do. So I choose only to provide base64 encoded receipts to the user, then he can deal with them the way he wants...
 
The code bellow may eventually work... it is untested

static NSString *rootAppleCA = @"MIIEuzCCA6OgAwIBAgIBAjANBgkqhkiG9w0BAQUFADBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwHhcNMDYwNDI1MjE0MDM2WhcNMzUwMjA5MjE0MDM2WjBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDkkakJH5HbHkdQ6wXtXnmELes2oldMVeyLGYne+Uts9QerIjAC6Bg++FAJ039BqJj50cpmnCRrEdCju+QbKsMflZ56DKRHi1vUFjczy8QPTc4UadHJGXL1XQ7Vf1+b8iUDulWPTV0N8WQ1IxVLFVkds5T39pyez1C6wVhQZ48ItCD3y6wsIG9wtj8BMIy3Q88PnT3zK0koGsj+zrW5DtleHNbLPbU6rfQPDgCSC7EhFi501TwN22IWq6NxkkdTVcGvL0Gz+PvjcM3mo0xFfh9Ma1CWQYnEdGILEINBhzOKgbEwWOxaBDKMaLOPHd5lc/9nXmW8Sdh2nzMUZaF3lMktAgMBAAGjggF6MIIBdjAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUK9BpR5R2Cf70a40uQKb3R01/CF4wHwYDVR0jBBgwFoAUK9BpR5R2Cf70a40uQKb3R01/CF4wggERBgNVHSAEggEIMIIBBDCCAQAGCSqGSIb3Y2QFATCB8jAqBggrBgEFBQcCARYeaHR0cHM6Ly93d3cuYXBwbGUuY29tL2FwcGxlY2EvMIHDBggrBgEFBQcCAjCBthqBs1JlbGlhbmNlIG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0YW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBjb25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZpY2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMA0GCSqGSIb3DQEBBQUAA4IBAQBcNplMLXi37Yyb3PN3m/J20ncwT8EfhYOFG5k9RzfyqZtAjizUsZAS2L70c5vu0mQPy3lPNNiiPvl4/2vIB+x9OYOLUyDTOMSxv5pPCmv/K/xZpwUJfBdAVhEedNO3iyM7R6PVbyTi69G3cN8PReEnyvFteO3ntRcXqNx+IjXKJdXZD9Zr1KIkIxH3oayPc4FgxhtbCS+SsvhESPBgOJ4V9T0mZyCKM2r3DYLP3uujL/lTaltkwGMzd/c6ByxW69oPIQ7aunMZT7XZNn/Bh1XZp5m5MkL72NVxnn6hUrcbvZNCJBIqxw8dtk2cXmPIS4AXUKqK1drk/NAJBzewdXUh";

- (void) verifyReceipt: (CDVInvokedUrlCommand*)command {
    CDVPluginResult* pluginResult;
    NSData *receiptData = [self appStoreReceipt];
    if (receiptData) {

        // Get receipt bytes
        void *receiptBytes = malloc([receiptData length]);
        [receiptData getBytes:receiptBytes length:[receiptData length]];
        BIO *b_receipt = BIO_new_mem_buf(receiptBytes, (int)[receiptData length]);

        // Get apple certificate bytes
        int appleLength = 0;
        void *appleBytes = unbase64(rootAppleCA, (int)[rootAppleCA length], &appleLength);
        BIO *b_x509 = BIO_new_mem_buf(appleBytes, appleLength);

        // Convert receipt data to PKCS7
        PKCS7 *p7 = d2i_PKCS7_bio(b_receipt, NULL);

        // Create the certificate store
        X509_STORE *store = X509_STORE_new();
        X509 *appleRootCA = d2i_X509_bio(b_x509, NULL);
        X509_STORE_add_cert(store, appleRootCA);

        // Verify the signature
        BIO *b_receiptPayload;
        int result = PKCS7_verify(p7, NULL, store, b_receiptPayload, 0);
        
        free(receiptBytes);
        free(appleBytes);

        if (result == 1) {
            // Receipt signature is valid.
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        }
        else {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                                             messageAsString:@"Invalid receipt signature"];
        }
    }
    else {
        // Older version of iOS, cannot check receipt on the device.
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}
*/

- (void) appStoreReceipt: (CDVInvokedUrlCommand*)command {

    NSString *base64 = nil;
    NSData *receiptData = [self appStoreReceipt];
    if (receiptData != nil) {
        base64 = [receiptData convertToBase64];
        // DLog(@"base64 receipt: %@", base64);
    }
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                      messageAsString:base64];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end

/**
 * Receives product data for multiple productIds and passes arrays of
 * js objects containing these data to a single callback method.
 */
@implementation BatchProductsRequestDelegate

@synthesize plugin, command;

- (void)productsRequest:(SKProductsRequest*)request didReceiveResponse:(SKProductsResponse*)response {

    DLog(@"productsRequest: didReceiveResponse:");
    NSMutableArray *validProducts = [NSMutableArray array];
    DLog(@"Has %li validProducts", (unsigned long)[response.products count]);
	for (SKProduct *product in response.products) {
        DLog(@" - %@: %@", product.productIdentifier, product.localizedTitle);
        [validProducts addObject:
         [NSDictionary dictionaryWithObjectsAndKeys:
          NILABLE(product.productIdentifier),    @"id",
          NILABLE(product.localizedTitle),       @"title",
          NILABLE(product.localizedDescription), @"description",
          NILABLE(product.localizedPrice),       @"price",
          nil]];
        [self.plugin.list setObject:product forKey:[NSString stringWithFormat:@"%@", product.productIdentifier]];
    }

    NSArray *callbackArgs = [NSArray arrayWithObjects:
                             NILABLE(validProducts),
                             NILABLE(response.invalidProductIdentifiers),
                             nil];

    CDVPluginResult* pluginResult =
      [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:callbackArgs];
    DLog(@"productsRequest: didReceiveResponse: sendPluginResult: %@", callbackArgs);
    [self.plugin.commandDelegate sendPluginResult:pluginResult callbackId:self.command.callbackId];

#if ARC_ENABLED
    // For some reason, the system needs to send more messages to the productsRequestDelegate after this.
    // However, it doesn't retain it which causes a crash!
    // That's why we need keep references to the productsRequest[Delegate] objects...
    // It's no big thing anyway, and it's a one time thing.
    // [self.plugin.retainer removeObjectForKey:@"productsRequest"];
    // [self.plugin.retainer removeObjectForKey:@"productsRequestDelegate"];
#else
	[request release];
	[self    release];
#endif
}

- (void)request:(SKRequest *)request didFailWithError:(NSError *)error
{
    DLog(@"In-App Store unavailable (ERROR %i)", error.code);
    DLog(@"%@", [error localizedDescription]);
}

#if ARC_DISABLED
- (void) dealloc {
	[plugin  release];
	[command release];
	[super   dealloc];
}
#endif

@end
