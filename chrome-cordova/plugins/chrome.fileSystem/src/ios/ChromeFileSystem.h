// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cordova/CDVPlugin.h>

@protocol ChromeFilePickerViewControllerDelegate <NSObject>

- (void)userDidSelectFile:(NSString*)file inPath:(NSString *)path;
- (void)userDidCancel;

@end

@interface ChromeFileSystem : CDVPlugin<ChromeFilePickerViewControllerDelegate,UIPopoverControllerDelegate> {}

- (void)chooseEntry:(CDVInvokedUrlCommand*)command;

@property(nonatomic,retain) UIPopoverController* popoverController;
@property(nonatomic,retain) NSString *callbackId;

@end

@interface PaddedTextField : UITextField {}
@end

@interface ChromeFilePickerViewController : UIViewController<UITableViewDataSource,UITableViewDelegate,UITextFieldDelegate> {}

- (ChromeFilePickerViewController *)initWithOptions:(NSDictionary *)options andStyle:(UITableViewStyle)style;

@property(nonatomic,retain) NSURL* fileSystemURL;
@property(nonatomic,retain) NSArray* filenames;
@property(nonatomic,retain) NSArray *sectionDescriptions;
@property(nonatomic,copy) NSString* currentFilename;
@property(nonatomic,retain) UITableView* fileListView;
@property(nonatomic,retain) PaddedTextField* fileNameView;
@property(nonatomic,retain) UIButton* okButton;
@property(nonatomic,retain) UIButton* cancelButton;
@property(nonatomic,weak) id delegate;

// Options
@property(nonatomic,retain) NSString *dialogTitle;
@property(atomic, assign) BOOL canCreate;
@property(atomic, assign) BOOL needWritable;
@property(atomic, assign) BOOL includeTextInput;
@property(nonatomic,retain) NSArray *accepts;
@property(atomic, assign) BOOL acceptsAllTypes;

@end
