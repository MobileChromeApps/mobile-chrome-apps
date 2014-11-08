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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * The advertising data sent by the Bluetooth accessory as described in the
 * <a href="https://www.bluetooth.org/DocMan/handlers/DownloadDoc.ashx?doc_id=282159">
 * Specification of the Bluetooth System 4.1 Volume 3, Part C, Section 11.</a>
 *
 * @see <a href="https://www.bluetooth.org/en-us/specification/adopted-specifications">
 * Specification Adopted Documents</a>
 */

public class AdvertisingData {

  private static final String UUID_16_FORMAT = "0000%04X-0000-1000-8000-00805F9B34FB";

  /**
   * Return the complete or shortened local name, or null if not available.
   */
  public static String getName(byte[] scanRecord) {
    String name = getCompleteName(scanRecord);
    if (name == null) {
      name = getShortName(scanRecord);
    }
    return name;
  }

  /**
   * Get the short name contained in the buffer, or null if not available.
   */
  public static String getShortName(byte[] scanRecord) {
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.SHORT_NAME);
    if (pos > 0) {
      int len = getSizeOfBlock(scanRecord, pos);
      return new String(scanRecord, pos, len);
    }
    return null;
  }

  /**
   * Get the complete name contained in the buffer, or null if not available.
   */
  public static String getCompleteName(byte[] scanRecord) {
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.COMPLETE_NAME);
    if (pos > 0) {
      int len = getSizeOfBlock(scanRecord, pos);
      return new String(scanRecord, pos, len);
    }
    return null;
  }

  /**
   * Gets the list of UUIDs for each advertising service.
   * <p>
   * There are three sizes of Service UUIDs that may be returned:
   * <ul>
   * <li>16-bit Bluetooth Service UUIDs
   * <li>32-bit Bluetooth Service UUIDs
   * <li>Global 128-bit Service UUIDs
   * </ul>
   * Two Service UUID data types are assigned to each size of Service UUID. One Service UUID data
   * type indicates that the Service UUID list is incomplete and the other indicates the Service
   * UUID list is complete.
   * <p>
   * The returned list is never null, but it might be empty.
   * <p>
   * The Bluetooth Standard takes Service UUIDs for 16-bit and 32-bit and combines them with a well
   * known UUID pattern to form a 128-bit Service UUID.
   */
  public static List<UUID> getServiceUuids(byte[] scanRecord) {
    List<UUID> uuids = new ArrayList<UUID>();

    // Incomplete list of 16-bit Service Class UUIDs.
    add16BitUUIDsToList(scanRecord, AssignedNumbers.UUID16_PART, uuids);

    // Complete List of 16-bit Service Class UUIDs.
    add16BitUUIDsToList(scanRecord, AssignedNumbers.UUID16, uuids);

    // TODO:: add matching on 32-bit UUIDs

    // Incomplete List of 128-bit Service Class UUIDs.
    add128BitUUIDsToList(scanRecord, AssignedNumbers.UUID128_PART, uuids);

    // Complete List of 128-bit Service Class UUIDs.
    add128BitUUIDsToList(scanRecord, AssignedNumbers.UUID128, uuids);
    return uuids;
  }

  /**
   * Return the Service Data contained in a Google BLE Tag, or null if not available.
   */
  public static byte[] getServiceData(byte[] scanRecord) {
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.SERVICE);
    if (pos >= 2) {
      int len = getSizeOfBlock(scanRecord, pos);
      short id = getShort(scanRecord, pos);
      pos += 2;
      Logger.logVerbose("Service ID 0x" + Integer.toHexString(id) + " len=" + len);
      // shorts are 2 bytes long, so subtracting 2 from length
      return Arrays.copyOfRange(scanRecord, pos, pos + len - 2);
    }
    return null;
  }

  /**
   * Return the ID contained in a Google BLE Tag (Service Data), or null if not available.
   */
  public static Integer getServiceDataId(byte[] scanRecord) {
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.SERVICE);
    if (pos != -1) {
      short id = getShort(scanRecord, pos);
      return Integer.valueOf(id);
    }
    return null;
  }

  /**
   * Return the buffer offset of the Service Data, or null if not available.
   * Used for manufacturer specific data decoding.
   */
  public static Integer getServiceDataOffset(byte[] scanRecord) {
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.SERVICE);
    if (pos != -1) {
      return pos + 2; // Move past the Service ID
    }
    return null;
  }

  /**
   * Return the transmit power rssi in the range [-127, 127] dBm.
   * The TX Power indicates the transmitted power rssi of the packet containing the data type
   */
  public static Integer getTxPowerLevel(byte[] scanRecord) {
    // Check for BLE 4.0 TX power
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.TXPOWER);
    if (pos > 0) {
      return Integer.valueOf(scanRecord[pos]);
    }
    return null;
  }

  /**
   * Return the Manufacturer Data contained in a scan record.
   * <p>
   * The Manufacturer Specific data type is used for manufacturer specific data. The first two data
   * octets shall contain a company identifier code from the Assigned Numbers - Company Identifiers
   * document. The interpretation of any other octets within the data shall be defined by the
   * manufacturer specified by the company identifier.
   */
  public static byte[] getManufacturerData(byte[] scanRecord) {
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.MANUFACTURER);
    if (pos >= 2) {
      int len = getSizeOfBlock(scanRecord, pos);
      short id = getShort(scanRecord, pos);
      pos += 2;
      Logger.logVerbose("Manufacturer ID 0x" + Integer.toHexString(id) + " len=" + len);
      // shorts are 2 bytes long, so subtracting 2 from length
      return Arrays.copyOfRange(scanRecord, pos, pos + len - 2);
    }
    return null;
  }

  /**
   * Return the ID contained in a Google BLE Tag (Manufacturer Data)
   */
  public static Integer getManufacturerCode(byte[] scanRecord) {
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.MANUFACTURER);
    if (pos != -1) {
      short id = getShort(scanRecord, pos);
      return Integer.valueOf(id);
    }
    return null;
  }

  /**
   * Return the buffer offset of the Manufacturer Data. Used for manufacturer specific data decoding
   */
  public static Integer getManufacturerDataOffset(byte[] scanRecord) {
    int pos = findCodeInBuffer(scanRecord, AssignedNumbers.MANUFACTURER);
    if (pos != -1) {
      return pos + 2; // Move past the Manufacturer ID
    }
    return null;
  }

  /**
   * Get unsigned byte from buffer as an integer
   */
  public static int getUnsignedByte(byte[] src, int offset) {
    return src[offset] & 0xff;
  }

  /**
   * Get 16-bit integer from buffer with byte order reversed
   */
  public static short getShort(byte[] src, int offset) {
    return (short) (((src[offset + 1] & 0xff) << 8) | (src[offset] & 0xff));
  }

  /**
   * Get 32-bit integer from buffer with byte order reversed
   */
  public static int getInt(byte[] src, int offset) {
    return ((src[offset] & 0xff) << 0) | ((src[offset + 1] & 0xff) << 8)
        | ((src[offset + 2] & 0xff) << 16) | ((src[offset + 3] & 0xff) << 24);
  }

  /**
   * Get 64-bit integer from buffer with byte order reversed
   */
  public static long getLong(byte[] src, int offset) {
    int l = ((src[offset] & 0xff) << 0) | ((src[offset + 1] & 0xff) << 8)
        | ((src[offset + 2] & 0xff) << 16) | ((src[offset + 3] & 0xff) << 24);
    int h = ((src[offset + 4] & 0xff) << 0) | ((src[offset + 5] & 0xff) << 8)
        | ((src[offset + 6] & 0xff) << 16) | ((src[offset + 7] & 0xff) << 24);
    return (((long) h) << 32L) | (l) & 0xffffffffL;
  }

  /**
   * Get bytes from a buffer in big-endian (network) order, starting at the given offset.
   */
  public static long getBytesBigEndianAsLong(byte[] src, int offset, int numBytes) {
    long result = 0;
    int maxIndex = numBytes - 1;
    for (int i = 0; i < maxIndex; i++) {
      // Or in the new byte, and shift left by 8 bits, ready for next byte
      result = (result | getUnsignedByte(src, offset + i)) << 8;
    }
    return result | getUnsignedByte(src, offset + maxIndex);
  }

  /**
   * Helper function to extract 16-bit UUIDS from the scan record and add them to the given list.
   */
  private static void add16BitUUIDsToList(byte[] scanRecord, byte code, List<UUID> uuids) {
    int pos = findCodeInBuffer(scanRecord, code);
    if (pos > 0) {
      int len = getSizeOfBlock(scanRecord, pos);
      while (len >= 2) {
        short uuid16 = getShort(scanRecord, pos);
        uuids.add(UUID.fromString(String.format(UUID_16_FORMAT, uuid16 & 0xFFFF)));
        len -= 2;
        pos += 2;
      }
    }
  }

  /**
   * Helper function to extract 128-bit UUIDS from the scan record and add them to the given list.
   */
  private static void add128BitUUIDsToList(byte[] scanRecord, byte code, List<UUID> uuids) {
    int pos = findCodeInBuffer(scanRecord, code);
    if (pos > 0) {
      int len = getSizeOfBlock(scanRecord, pos);
      while (len >= 16) {
        long lsb = getLong(scanRecord, pos);
        long msb = getLong(scanRecord, pos + 8);
        uuids.add(new UUID(msb, lsb));
        len -= 16;
        pos += 16;
      }
    }
  }

  /**
   * Get the position of the data block for the code in the buffer (after the length and code
   * values), or -1 if not found.
   */
  private static int findCodeInBuffer(byte[] buffer, byte code) {
    final int length = buffer.length;
    int i = 0;
    while (i < length - 2) {
      int len = buffer[i];
      if (len < 0) {
        return -1;
      }

      if (i + len >= length) {
        return -1;
      }

      byte tcode = buffer[i + 1];
      if (tcode == code) {
        return i + 2;
      }

      i += len + 1;
    }

    return -1;
  }

  /**
   * Get the size in bytes of the data block in the buffer starting at the given position.
   */
  private static int getSizeOfBlock(byte[] buffer, int pos) {
    /*
     * Each data block is prefixed by 2 bytes that represent:
     * byte#1 - total length of the data block (excluding this first byte);
     * byte#2 - type of the data block.
     * This method returns the value of #1 decremented by 1, since value #2 (type of the data block)
     * will not be included. See also the position() method.
     */
    return buffer[pos - 2] - 1;
  }

  /**
   * Return the hexadecimal representation of the bytes in the scan record.
   */
  public static String toHexString(byte[] scanRecord) {
    return byteArrayToHex(scanRecord, 0, scanRecord.length);
  }

  /**
   * Turn some part of a byte[] into a printable string
   */
  private static String byteArrayToHex(byte[] a, int start, int length) {
    StringBuilder builder = new StringBuilder();
    for (int i = 0; i < length; i++) {
      builder.append(String.format("%02x ", a[start + i] & 0xFF));
    }

    return builder.toString();
  }
}
