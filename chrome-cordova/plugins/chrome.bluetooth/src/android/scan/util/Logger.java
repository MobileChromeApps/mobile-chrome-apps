/*
 * Copyright 2014 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.uribeacon.scan.util;

import android.util.Log;

/**
 * Utility methods for error/warning/info/debug/verbose logging.
 */
public class Logger {

  public static final String TAG = "BleScanCompatLib";

  public static void logVerbose(String message) {
    if (Log.isLoggable(TAG, Log.VERBOSE)) {
      Log.v(TAG, message);
    }
  }

  public static void logWarning(String message) {
    if (Log.isLoggable(TAG, Log.WARN)) {
      Log.w(TAG, message);
    }
  }

  public static void logDebug(String message) {
    if (Log.isLoggable(TAG, Log.DEBUG)) {
      Log.d(TAG, message);
    }
  }

  public static void logInfo(String message) {
    if (Log.isLoggable(TAG, Log.INFO)) {
      Log.i(TAG, message);
    }
  }

  public static void logError(String message, Exception... e) {
    if (Log.isLoggable(TAG, Log.ERROR)) {
      if (e == null || e.length == 0) {
        Log.e(TAG, message);
      } else {
        Log.e(TAG, message, e[0]);
      }
    }
  }
}
