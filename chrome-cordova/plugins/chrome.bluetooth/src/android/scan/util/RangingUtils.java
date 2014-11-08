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
 * Ranging utilities embody the physics of converting RF path loss to distance. The free space
 * path loss is proportional to the square of the distance from transmitter to receiver, and to the
 * square of the frequency of the propagation signal.
 */
public class RangingUtils {

  /*
   * Key to variable names used in this class (viz. Physics):
   *
   * c = speed of light (2.9979 x 10^8 m/s);
   *
   * f = frequency (Bluetooth frequency is 2.45GHz = 2.45x10^9 Hz);
   *
   * l = wavelength (meters);
   *
   * d = distance (from transmitter to receiver in meters);
   *
   *
   * Free-space path loss (FSPL) is proportional to the square of the distance between the
   * transmitter and the receiver, and also proportional to the square of the frequency of the
   * radio signal.
   *   *
   * FSPL = (4 * pi * d / l)^2 = (4 * pi * d * f / c )^2
   *
   * FSPL (dBm) = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c) = 20*log10(d) + PATH_LOSS_AT_1M
   *
   * Calculating constants:
   *
   * FSPL_FREQ = 20*log10(f) = 20*log10(2.45 * 10^9) = 188.78 [round to 189]
   *
   * FSPL_LIGHT = 20*log10(4*pi/c) = 20*log10(4pi/2.9979*10^8) = -147.55 [round to -148]
   *
   * PATH_LOSS_AT_1M = FSPL_FREQ + FSPL_LIGHT = 188.78 - 147.55 = 41.23 [round to 41]
   *
   *
   * Re-arranging formula to provide a solution for distance when the path loss (FPSL) is available:
   *
   * 20*log10(d) = path loss - PATH_LOSS_AT_1M
   *
   * distance(d) = 10^((path loss - PATH_LOSS_AT_1M)/20.0)
   *
   * The beacon will broadcast its power as it would be seen in ideal conditions at 1 meter,
   * computed using the following equation from its own source power.
   *
   * calibratedTxPower = txPowerAtSource - path loss at 1m (for BLE 1m path loss is 41dBm)
   */

  // Free Space Path Loss (FSPL) Constants (see above)
  private static final int FSPL_FREQ = 189;
  private static final int FSPL_LIGHT = -148;

  /* (dBm) PATH_LOSS at 1m for isotropic antenna transmitting BLE */
  public static final int PATH_LOSS_AT_1M = FSPL_FREQ + FSPL_LIGHT; // const = 41

  /**
   * Different region categories, based on distance range.
   */
  public interface Region {
    public final int UNKNOWN = -1;
    public final int NEAR = 0;
    public final int MID = 1;
    public final int FAR = 2;
  }

  // Cutoff distances between different regions.
  public static final double NEAR_TO_MID_METERS = 0.5;
  public static final double MID_TO_FAR_METERS = 2.0;

  public static final int DEFAULT_TX_POWER_LEVEL = -77;

  /**
   * @constructor
   */
  private RangingUtils() {}

  /**
   * Convert  RSSI to path loss using the free space path loss equation. See
   * <a href="http://en.wikipedia.org/wiki/Free-space_path_loss">Free-space_path_loss</a>
   * 
   * @param rssi Received Signal Strength Indication (RSSI) in dBm
   * @param calibratedTxPower the calibrated power of the transmitter (dBm) at 1 meter
   * @return The calculated path loss.
   */
  public static int pathLossFromRssi(int rssi, int calibratedTxPower) {
    return calibratedTxPower + RangingUtils.PATH_LOSS_AT_1M - rssi;
  }

  /**
   * Convert RSSI to distance using the free space path loss equation. See <a
   * href="http://en.wikipedia.org/wiki/Free-space_path_loss">Free-space_path_loss</a>
   *
   * @param distanceInMeters distance in meters (m)
   * @param calibratedTxPower transmitted power (dBm) calibrated to 1 meter
   * @return the rssi (dBm) that would be measured at that distance
   */
  public static int rssiFromDistance(double distanceInMeters, int calibratedTxPower) {
    double pathLoss = 20 * Math.log10(distanceInMeters) + PATH_LOSS_AT_1M;
    int txPowerAtSource = calibratedTxPower + PATH_LOSS_AT_1M;
    return (int) (txPowerAtSource - pathLoss);
  }

  /**
   * Convert RSSI to distance using the free space path loss equation. See <a
   * href="http://en.wikipedia.org/wiki/Free-space_path_loss">Free-space_path_loss</a>
   *
   * @param rssi Received Signal Strength Indication (RSSI) in dBm
   * @param calibratedTxPower the calibrated power of the transmitter (dBm) at 1 meter
   * @return the distance at which that rssi value would occur in meters
   */
  public static double distanceFromRssi(int rssi, int calibratedTxPower) {
    int txPowerAtSource = calibratedTxPower + PATH_LOSS_AT_1M;
    int pathLoss = txPowerAtSource - rssi;
    // Distance calculation
    return Math.pow(10, (pathLoss - PATH_LOSS_AT_1M) / 20.0);
  }

  /**
   * Determine the region of a beacon given its perceived distance.
   *
   * @param distance The measured distance in meters.
   * @return the region as one of the constants in {@link Region}.
   */
  public static int regionFromDistance(double distance) {
    if (distance < 0) {
      return Region.UNKNOWN;
    }
    if (distance <= NEAR_TO_MID_METERS) {
      return Region.NEAR;
    }
    if (distance <= MID_TO_FAR_METERS) {
      return Region.MID;
    }
    return Region.FAR;
  }

  /**
   * Return a short descriptive string for the supplied region.
   *
   * @param region
   * @return a string for the region
   */
  public static String toString(int region) {
    switch (region) {
      case Region.NEAR:
        return "near";
      case Region.MID:
        return "mid";
      case Region.FAR:
        return "far";
      case Region.UNKNOWN:
        return "unknown";
      default:
        return "unexpected region value: " + region;
    }
  }
}
