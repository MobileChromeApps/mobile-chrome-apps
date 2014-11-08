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

package org.uribeacon.scan.compat;

import java.util.Arrays;

import android.support.annotation.Nullable;

/**
 * Small class to contain local copies of the JavaSE 7 java.util.Objects methods
 * used in the compat package.  Several compat classes are built by copying them
 * almost verbatim from the Android 'L' release API; however, not all projects
 * support JavaSE 7 yet.  By implementing these methods locally, we avoid
 * having to depend on java.util.Objects.
 *
 * TODO: remove this class once projects using this library support Java 7.
 */
class Objects {

  public static boolean equals(@Nullable Object a, @Nullable Object b) {
    return (a == b) || ((a != null) && a.equals(b));
  }

  // This is a byte[]-specific implementation.
  public static boolean deepEquals(byte[] a, byte[] b) {
    return ((a == null) && (b == null))
        || ((a != null) && (b != null) && Arrays.equals(a, b));
  }

  public static int hash(@Nullable Object... objects) {
    return Arrays.hashCode(objects);
  }
  
  public static String toString(@Nullable Object a) {
    return (a == null) ? "[null]" : a.toString();
  }
}
