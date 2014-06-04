// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import "ChromeFileSystem.h"
#import <MobileCoreServices/MobileCoreServices.h>

#pragma mark ChromeFileSystem

@implementation ChromeFileSystem

@synthesize popoverController=_popoverController,
            callbackId=_callbackId;

- (void)chooseEntry:(CDVInvokedUrlCommand*)command
{
    self.callbackId = command.callbackId;

    NSDictionary *options = [command argumentAtIndex:0 withDefault:@{}];

    ChromeFilePickerViewController *pickerController = [[ChromeFilePickerViewController alloc] initWithOptions:options andStyle:UITableViewStylePlain];
    pickerController.delegate = self;
    if (UI_USER_INTERFACE_IDIOM() == UIUserInterfaceIdiomPad) {
        self.popoverController = [[UIPopoverController alloc] initWithContentViewController:pickerController];
        self.popoverController.delegate = self;
        [self.popoverController presentPopoverFromRect:CGRectMake(50,100,320,568) inView:self.webView permittedArrowDirections:0 animated:YES];
    } else {
        pickerController.modalTransitionStyle = UIModalTransitionStyleCoverVertical;
        [self.viewController presentViewController:pickerController animated:YES completion:nil];
    }
}

- (void)userDidSelectFile:(NSString*)file inPath:(NSString *)path
{
    if (UI_USER_INTERFACE_IDIOM() == UIUserInterfaceIdiomPad) {
        [self.popoverController dismissPopoverAnimated:YES];
    } else {
        [self.viewController dismissViewControllerAnimated:YES completion:nil];
    }
    NSLog(@"File: %@",file);
    NSString *pathURI = [NSString stringWithFormat:@"file://%@", path];
    NSString *fileURI = [NSString stringWithFormat:@"file://%@/%@", path,file];
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:@{@"uri": fileURI, @"file": file, @"pathuri": pathURI, @"path": path}];
    [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
}

- (void)userDidCancel
{
    if (UI_USER_INTERFACE_IDIOM() == UIUserInterfaceIdiomPad) {
        [self.popoverController dismissPopoverAnimated:YES];
    } else {
        [self.viewController dismissViewControllerAnimated:YES completion:nil];
    }
    NSLog(@"Canceled");
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:false];
    [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
}

- (void)popoverControllerDidDismissPopover:(UIPopoverController *)popoverController
{
    NSLog(@"Canceled");
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:false];
    [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
}

@end

@implementation PaddedTextField

- (CGRect)textRectForBounds:(CGRect)bounds {
     return CGRectInset(bounds, 10, 5);
}

- (CGRect)editingRectForBounds:(CGRect)bounds {
     return CGRectInset(bounds, 10, 5);
}

@end

@implementation ChromeFilePickerViewController

@synthesize fileSystemURL=_fileSystemURL,
            filenames=_filenames,
            fileListView=_fileListView,
            fileNameView=_fileNameView,
            okButton=_okButton,
            cancelButton=_cancelButton,
            delegate=_delegate,
currentFilename=_currentFilename,
dialogTitle=_dialogTitle,
canCreate=_canCreate,
needWritable=_needWritable,
includeTextInput=_includeTextInput,
accepts=_accepts,
acceptsAllTypes=_acceptsAllTypes,
sectionDescriptions=_sectionDescriptions;

- (ChromeFilePickerViewController *)initWithOptions:(NSDictionary *)options andStyle:(UITableViewStyle)style {
  self = [super initWithNibName:nil bundle:nil];
  if (self != nil) {

    [self parseOptions:options];

    _currentFilename = nil;

    _fileSystemURL = [[[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask]objectAtIndex:0];
    [self loadFilenamesFromURL:_fileSystemURL];
    self.contentSizeForViewInPopover = CGSizeMake(320,568);
  }
  return self;
}

// Returns whether a particular file matches an accept clause, based on the file extension
// and/or MIME type.
- (BOOL)file:(NSURL *)fileURL matchesAcceptCondition:(NSDictionary *)accept
{
  NSDictionary *wildcardTypes = @{
    @"text/*": @"public.text",
    @"image/*": @"public.image",
    @"audio/*": @"public.audio",
    @"video/*": @"public.movie",
    @"*/*": @"public.data",
  };

  NSString *extension = [fileURL pathExtension];

  NSArray *acceptableExtensions = [accept objectForKey:@"extensions"];
  if (acceptableExtensions && [acceptableExtensions containsObject:extension]) {
    return YES;
  }

  BOOL matches = NO;
  NSArray *mimeTypes = [accept objectForKey:@"mimeTypes"];
  if (mimeTypes) {
    CFStringRef extensionType = UTTypeCreatePreferredIdentifierForTag(kUTTagClassFilenameExtension, (__bridge_retained CFStringRef)extension, NULL);
    for (NSString *mimeType in mimeTypes) {
      NSString *typeName = [wildcardTypes objectForKey:mimeType];
      CFStringRef uti = typeName
        ? (__bridge_retained CFStringRef)typeName
        : UTTypeCreatePreferredIdentifierForTag(kUTTagClassMIMEType, (__bridge_retained CFStringRef)mimeType, NULL);
      matches = UTTypeConformsTo(extensionType, uti);
      CFRelease(uti);
      if (matches) {
        break;
      }
    }
    CFRelease(extensionType);
  }
  return matches;
}

// Returns the description which should be used in the file chooser for a particular condition
// ("accept" clause in the options object). This will be the explicit description, if provided,
// or else a set of file patterns based on the allowed extensions / MIME types.
- (NSString *)descriptionForCondition:(NSDictionary *)acceptCondition
{
  NSDictionary *wildcardTypes = @{
    @"text/*": @"Text Files",
    @"image/*": @"Image Files",
    @"audio/*": @"Audio Files",
    @"video/*": @"Video Files",
    @"*/*": @"All Files",
  };
  NSString *description = [acceptCondition objectForKey:@"description"];
  if (description) return description;
  NSMutableArray *acceptedTypes = [[NSMutableArray alloc] init];
  for (NSString *extension in ([acceptCondition objectForKey:@"extensions"] ?: @[])) {
    [acceptedTypes addObject:[NSString stringWithFormat:@"*.%@", extension]];
  }
  for (NSString *mimeType in ([acceptCondition objectForKey:@"mimeTypes"] ?: @[])) {
    NSString *typeName = [wildcardTypes objectForKey:mimeType];
    if (typeName) {
      [acceptedTypes addObject:[NSString stringWithFormat:@"*.%@", typeName]];
    } else {
      CFStringRef uti = UTTypeCreatePreferredIdentifierForTag(kUTTagClassMIMEType, (__bridge_retained CFStringRef)mimeType, NULL);
      NSString *extension = (__bridge_transfer NSString*)UTTypeCopyPreferredTagWithClass(uti, kUTTagClassFilenameExtension);
      if (extension) {
        [acceptedTypes addObject:[NSString stringWithFormat:@"*.%@", extension]];
      }
      CFRelease(uti);
    }
  }
  return [acceptedTypes componentsJoinedByString:@", "];
}

- (void)parseOptions:(NSDictionary *)options
{
  self.dialogTitle = [options valueForKey:@"title"] ?: @"Open File";
  self.canCreate = [[options valueForKey:@"canCreate"] boolValue];
  self.needWritable = [[options valueForKey:@"needWritable"] boolValue];
  self.includeTextInput = [[options valueForKey:@"includeTextInput"] boolValue];
  self.accepts = [options valueForKey:@"accepts"];
  self.acceptsAllTypes = [[options valueForKey:@"acceptsAllTypes"] boolValue];
}

- (void)loadFilenamesFromURL:(NSURL *)url
{
  //TODO: Check error
  NSArray *fileList = [[NSFileManager defaultManager] contentsOfDirectoryAtURL:url includingPropertiesForKeys:@[NSURLNameKey, NSURLIsDirectoryKey, NSURLIsReadableKey, NSURLIsWritableKey] options:NSDirectoryEnumerationSkipsHiddenFiles error:NULL];
  NSString *fileName = nil;
  NSNumber *isDirectory = nil;
  NSNumber *isReadable = nil;

  NSMutableArray *tmp_filenames = [[NSMutableArray alloc] init];
  NSMutableArray *tmp_sectionDescriptions = [[NSMutableArray alloc] init];

  for (NSDictionary *acceptCondition in self.accepts) {
    [tmp_filenames addObject:[[NSMutableArray alloc] init]];
    [tmp_sectionDescriptions addObject:[self descriptionForCondition:acceptCondition]];
  }
  if (self.acceptsAllTypes) {
    [tmp_filenames addObject:[[NSMutableArray alloc] init]];
    [tmp_sectionDescriptions addObject:@"Other Files"];
  }

  for (NSURL *fileURL in fileList) {
    if ([fileURL getResourceValue:&fileName forKey:NSURLNameKey error:NULL]) {
      [fileURL getResourceValue:&isDirectory forKey:NSURLIsDirectoryKey error:NULL];
      [fileURL getResourceValue:&isReadable forKey:NSURLIsReadableKey error:NULL];
      if (![fileName isEqualToString:@"__chromestorage_internal"] && ![isDirectory boolValue]) {
        int i=0;
        BOOL placed = NO;
        for (NSDictionary *acceptCondition in self.accepts) {
          if ([self file:fileURL matchesAcceptCondition:acceptCondition]) {
            [[tmp_filenames objectAtIndex:i] addObject:fileURL];
            placed = YES;
            break;
          }
          i++;
        }
        if (!placed && self.acceptsAllTypes) {
            [[tmp_filenames objectAtIndex:i] addObject:fileURL];
        }
      }
    }
  }

  // Prune empty sections
  NSIndexSet *is = [tmp_filenames indexesOfObjectsPassingTest:^BOOL(id obj, NSUInteger idx, BOOL *stop) {
    return [obj count] > 0;
  }];
  self.filenames = [tmp_filenames objectsAtIndexes:is];
  self.sectionDescriptions = [tmp_sectionDescriptions objectsAtIndexes:is];
}

// Sets up the UI for the file chooser dialog
-(void)loadView
{
  [super loadView];

  CGFloat viewHeight = MIN(self.contentSizeForViewInPopover.height, self.view.frame.size.height);

  // Set up the UI
  CGFloat fileListTop = self.includeTextInput ? 62 : 30;
  CGFloat fileListHeight = viewHeight - (self.includeTextInput ? 106 : 74);

  UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(0,0,320,30)];
  label.text = self.dialogTitle;
  label.backgroundColor = [UIColor blackColor];
  label.textColor = [UIColor whiteColor];
  label.textAlignment = NSTextAlignmentCenter;
  [[self view] addSubview:label];

  if (self.includeTextInput) {
    self.fileNameView = [[PaddedTextField alloc] initWithFrame:CGRectMake(0,30,320,32)];
    self.fileNameView.borderStyle = UITextBorderStyleRoundedRect;
    self.fileNameView.backgroundColor = [UIColor whiteColor];
    self.fileNameView.clearButtonMode = UITextFieldViewModeWhileEditing;
    self.fileNameView.autocorrectionType = UITextAutocorrectionTypeNo;
    self.fileNameView.autocapitalizationType = UITextAutocapitalizationTypeNone;
    self.fileNameView.placeholder = @"Enter filename";
    [self.fileNameView addTarget:self
                          action:@selector(changeFilename)
                forControlEvents:UIControlEventEditingChanged];
    [[self view] addSubview:self.fileNameView];
  }

  self.fileListView = [[UITableView alloc] initWithFrame:CGRectMake(0,fileListTop,320,fileListHeight) style:UITableViewStylePlain];
  self.fileListView.delegate = self;
  self.fileListView.dataSource = self;
  [[self view] addSubview:self.fileListView];

  self.okButton = [[UIButton alloc] initWithFrame:CGRectMake(0,(viewHeight-44),160,44)];
  [self.okButton setTitle:@"OK" forState:UIControlStateNormal];
  [self.okButton addTarget:self
                    action:@selector(dismissWithFilename)
          forControlEvents:UIControlEventTouchDown];
  [self.okButton setTitleColor:[UIColor whiteColor] forState:UIControlStateNormal];
  [self.okButton setTitleColor:[UIColor darkGrayColor] forState:UIControlStateDisabled];
  self.okButton.enabled = NO;
  [[self view] addSubview:self.okButton];

  self.cancelButton = [[UIButton alloc] initWithFrame:CGRectMake(160,(viewHeight-44),160,44)];
  [self.cancelButton setTitle:@"Cancel" forState:UIControlStateNormal];
  [self.cancelButton addTarget:self
                        action:@selector(dismissWithCancel)
              forControlEvents:UIControlEventTouchDown];
  [self.cancelButton setTitleColor:[UIColor whiteColor] forState:UIControlStateNormal];
  [[self view] addSubview:self.cancelButton];
}


- (void)viewDidUnload
{
    self.fileNameView = nil;
    self.fileListView = nil;
    self.okButton = nil;
    self.cancelButton = nil;
}

// Delegation

- (void)changeFilename
{
  self.currentFilename = self.fileNameView.text;
}

- (void)dismissWithFilename
{
  NSString *filename;
  if ([self.currentFilename isEqualToString:@""]) {
    filename = nil;
  } else {
    filename = self.currentFilename;
  }
  [self.delegate userDidSelectFile:filename inPath:[self.fileSystemURL path]];
}

- (void)dismissWithCancel
{
    [self.delegate userDidCancel];
}

#pragma mark UITableViewDataSource protocol methods

- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView
{
  return [self.filenames count];
}

- (NSString *)tableView:(UITableView *)tableView titleForHeaderInSection:(NSInteger)section
{
  if (self.acceptsAllTypes && [self.filenames count] == 1) {
    return nil;
  }
  return [self.sectionDescriptions objectAtIndex:section];
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
  return [[self.filenames objectAtIndex:section] count];
}

- (UITableViewCell*)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  static NSString *Identifier = @"ChromeFileSystemFile";

  UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:Identifier];
  if (cell == nil) {
    cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault reuseIdentifier:Identifier];
  }

  NSURL *fileURL = [[self.filenames objectAtIndex:[indexPath indexAtPosition:0]] objectAtIndex:[indexPath indexAtPosition:1]];
  cell.textLabel.text = [fileURL lastPathComponent];

  NSNumber *isReadable = nil;
  NSNumber *isWritable = nil;
  [fileURL getResourceValue:&isReadable forKey:NSURLIsReadableKey error:NULL];
  [fileURL getResourceValue:&isWritable forKey:NSURLIsWritableKey error:NULL];

  if (![isReadable boolValue] || (self.needWritable && ![isWritable boolValue])) {
    cell.textLabel.textColor = [UIColor lightGrayColor];
    cell.selectionStyle = UITableViewCellSelectionStyleNone;
    cell.userInteractionEnabled = NO;
  } else {
    cell.textLabel.textColor = [UIColor blackColor];
    cell.selectionStyle = UITableViewCellSelectionStyleBlue;
    cell.userInteractionEnabled = YES;
  }

  return cell;
}

#pragma mark UITableViewDelegate protocol methods

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
  UITableViewCell *cell = [tableView cellForRowAtIndexPath:indexPath];
  if (self.includeTextInput) {
    self.fileNameView.text = cell.textLabel.text;
  }
  self.currentFilename = cell.textLabel.text;
  self.okButton.enabled = YES;
}
@end

