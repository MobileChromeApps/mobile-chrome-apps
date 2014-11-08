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

/**
 * Bluetooth Assigned Numbers.
 * <p>
 *
 * The Official Bluetooth SIG Member Website | Assigned Numbers Overview | Generic Access Profile
 * <p>
 * Also see {@Link android.bluetooth.BluetoothAssignedNumbers}
 *
 * @see <a href="https://www.bluetooth.org/en-us/specification/assigned-numbers/generic-access-profile">
 * Bluetooth Generic Access Profile</a>
 */
public class AssignedNumbers {

  public static final byte FLAGS = 0x01;

  /* Incomplete list of 16-bit service class UUIDs */
  public static final byte UUID16_PART = 0x02;

  /* Complete list of 16-bit service class UUIDs */
  public static final byte UUID16 = 0x03;

  /* Incomplete list of 128-bit service class UUIDs */
  public static final byte UUID128_PART = 0x06;

  /* Complete list of 128-bit service class UUIDs */
  public static final byte UUID128 = 0x07;

  /* Shortened local name */
  public static final byte SHORT_NAME = 0x08;

  /* Complete local name */
  public static final byte COMPLETE_NAME = 0x09;

  /* TX power level */
  public static final byte TXPOWER = 0x0A;

  // Out-Of-Band fields

  /* Out Of Band Secure Simple Pairing Class of Device */
  public static final byte OOB_COD = 0x0D;

  /* Out Of Band Simple Pairing Hash C */
  public static final byte OOB_HASH_C = 0x0E;

  /* Out Of Band Simple Pairing Randomizer R */
  public static final byte OOB_RANDOMIZER_R = 0x0F;

  /* Device ID */
  public static final byte ID = 0x10;

  /* Manufacturer Specific Data */
  public static final byte MANUFACTURER = (byte) 0xFF;

  /* Service Data */
  public static final byte SERVICE = 0x16;

  /*
   * Utility class has no constructor.
   */
  private AssignedNumbers() {}
}
