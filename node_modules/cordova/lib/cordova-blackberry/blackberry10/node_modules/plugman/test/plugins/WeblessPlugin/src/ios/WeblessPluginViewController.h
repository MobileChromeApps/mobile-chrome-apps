/*
 *
 * Copyright 2013 Anis Kadri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

//
//  ChildBrowserViewController.h
//
//  Created by Jesse MacFadyen on 21/07/09.
//  Copyright 2009 Nitobi. All rights reserved.
//

#import <UIKit/UIKit.h>

@protocol ChildBrowserDelegate<NSObject>



/*
 *  onChildLocationChanging:newLoc
 *  
 *  Discussion:
 *    Invoked when a new page has loaded
 */
-(void) onChildLocationChange:(NSString*)newLoc;
-(void) onOpenInSafari;
-(void) onClose;
@end


@interface ChildBrowserViewController : UIViewController < UIWebViewDelegate > {
	IBOutlet UIWebView* webView;
	IBOutlet UIBarButtonItem* closeBtn;
	IBOutlet UIBarButtonItem* refreshBtn;
	IBOutlet UILabel* addressLabel;
	IBOutlet UIBarButtonItem* backBtn;
	IBOutlet UIBarButtonItem* fwdBtn;
	IBOutlet UIBarButtonItem* safariBtn;
	IBOutlet UIActivityIndicatorView* spinner;
	BOOL scaleEnabled;
	BOOL isImage;
	NSString* imageURL;
	NSArray* supportedOrientations;
	id <ChildBrowserDelegate> delegate;
}

@property (nonatomic, retain)id <ChildBrowserDelegate> delegate;
@property (nonatomic, retain) 	NSArray* supportedOrientations;
@property(retain) NSString* imageURL;
@property(assign) BOOL isImage;

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation) interfaceOrientation; 
- (ChildBrowserViewController*)initWithScale:(BOOL)enabled;
- (IBAction)onDoneButtonPress:(id)sender;
- (IBAction)onSafariButtonPress:(id)sender;
- (void)loadURL:(NSString*)url;
-(void)closeBrowser;

@end
