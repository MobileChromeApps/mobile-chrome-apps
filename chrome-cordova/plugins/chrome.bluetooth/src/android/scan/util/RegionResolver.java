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

import java.util.HashMap;
import java.util.Map;

/**
 * Provides the beacon that is nearest to the observer, and stabilizes the
 * region transitions (NEAR, MID and FAR) of beacons by using a hysteresis function.
 * <p>
 * For example, the hysteresis function transitions to the NEAR region when the
 * path loss rises above N, but does not transition out of NEAR until the path
 * loss drops below N-H, preventing a ping-pong effect on boundaries.
 */
public class RegionResolver {
  // The default hysteresis values for the near, mid and far regions,
  // in path loss units. These are the minimal change in path loss necessary to
  // change from the current region to a new region.
  private static final int DEFAULT_NEAREST_HYSTERESIS = 5;
  private static final int DEFAULT_MID_HYSTERESIS_LOW = 3;
  private static final int DEFAULT_MID_HYSTERESIS_HIGH = 2;
  private static final int DEFAULT_FAR_HYSTERESIS_LOW = 3;
  private static final int DEFAULT_FAR_HYSTERESIS_HIGH = 2;
  private static final double START_SMOOTHING_METERS = 1.0;

  private class DeviceSighting {
    private int mPathLoss;
    private int mRegion;
    private double mDistance;

    public DeviceSighting(int pathLoss, int region, double distance) {
      mPathLoss = pathLoss;
      mRegion = region;
      mDistance = distance;
    }

    public int getPathLoss() {
      return mPathLoss;
    }

    public int getRegion() {
      return mRegion;
    }

    public double getDistance() {
      return mDistance;
    }

    public void setDistance(double distance) {
      mDistance = distance;
    }

    public void setPathloss(int pathloss) {
      mPathLoss = pathloss;
    }

    public void setRegion(int region) {
      mRegion = region;
    }
  }

  private Map<String, DeviceSighting> mStabilizedDeviceRegion;
  private Integer mNearestHysteresis;
  private Integer mMidHysteresisLow;
  private Integer mFarHysteresisLow;
  private Integer mMidHysteresisHigh;
  private Integer mFarHysteresisHigh;
  private String mNearestAddress;
  private Integer mNearestPathLoss;
  private boolean mNotifyOnSameNearestDevice;
  private Map<String, WeightedAverage> mSmoothedRssi =
      new HashMap<String, WeightedAverage>();

  public RegionResolver() {
    mStabilizedDeviceRegion = new HashMap<String, DeviceSighting>();
    mNearestHysteresis = DEFAULT_NEAREST_HYSTERESIS;
    mMidHysteresisLow = DEFAULT_MID_HYSTERESIS_LOW;
    mMidHysteresisHigh = DEFAULT_MID_HYSTERESIS_HIGH;
    mFarHysteresisLow = DEFAULT_FAR_HYSTERESIS_LOW;
    mFarHysteresisHigh = DEFAULT_FAR_HYSTERESIS_HIGH;
    mNotifyOnSameNearestDevice = false;
  }

  public RegionResolver(int nearestHysteresis, int midHysteresisLow, int midHysteresisHigh,
      int farHysteresisLow, int farHysteresisHigh) {
    mStabilizedDeviceRegion = new HashMap<String, DeviceSighting>();
    mNearestHysteresis = nearestHysteresis;
    mMidHysteresisLow = midHysteresisLow;
    mMidHysteresisHigh = midHysteresisHigh;   
    mFarHysteresisLow = farHysteresisLow;
    mFarHysteresisHigh = farHysteresisHigh;
    mNotifyOnSameNearestDevice = false;
  }

  /**
   * Updates the stabilized region of a beacon by checking the
   * current state of the beacon (region, path loss) with the previous recorded state
   * to determine if a region change is warranted. The beacon path loss must have
   * changed by a hysteresis threshold to change to a new region. This stabilizes the
   * frequency of region changes for beacons near a boundary of two regions.
   * <p>
   * This function returns true if the beacon is determined to be the new nearest to
   * the phone. A nearest beacon must also be in the NEAR region.
   *
   * @return true if device is the new nearest.
   */
  public boolean onUpdate(String address, int rssi, int calibratedTxPower) {
    // Check to see if the beacon gets qualified as the beacon closest to the
    // listener.
    String currentNearest = mNearestAddress;
    boolean nearestHasChanged = false;

    int newPathLoss = RangingUtils.pathLossFromRssi(rssi, calibratedTxPower);
    double newDistance = RangingUtils.distanceFromRssi(rssi, calibratedTxPower);
    int newRegion = RangingUtils.regionFromDistance(newDistance);

    int smoothedRssi = getSmoothedRssi(address, rssi);

    // Don't apply smoothing to devices that are "close enough". These
    // will have a small region of error anyways, so no need to introduce
    // lag from the smoothing filter.
    boolean noSmoothing = newDistance < START_SMOOTHING_METERS;

    int smoothedPathLoss = noSmoothing ? newPathLoss
        : RangingUtils.pathLossFromRssi(smoothedRssi, calibratedTxPower);
    double smoothedDistance = noSmoothing ? newDistance
        : RangingUtils.distanceFromRssi(smoothedRssi, calibratedTxPower);
    int smoothedRegion = noSmoothing ? newRegion
        : RangingUtils.regionFromDistance(smoothedDistance);

    if (!address.equals(currentNearest)) {
      // Check the new sighting is in the NEAR region to continue
      if (newRegion == RangingUtils.Region.NEAR) {
        // Address of device NOT equal, but is it nearer?
        if (mNearestAddress == null || newPathLoss < mNearestPathLoss - mNearestHysteresis) {
          // Nearer device found.
          mNearestAddress = address;
          mNearestPathLoss = newPathLoss;
          nearestHasChanged = true;
        }
      }
    } else {
      // Only allow a device to be considered "nearest" if it is within the
      // nearest region.
      if (newRegion != RangingUtils.Region.NEAR) {
        mNearestAddress = null;
        mNearestPathLoss = 0;
        nearestHasChanged = true;
      } else {
        // Address EQUAL, so update path loss of nearest device
        mNearestPathLoss = newPathLoss;
      }
    }

    if (!mStabilizedDeviceRegion.containsKey(address)) {
      mStabilizedDeviceRegion.put(address, new DeviceSighting(smoothedPathLoss, smoothedRegion,
          smoothedDistance));
    } else {
      // If this is a device we've seen before, determine if the device has
      // changed its region classification.
      DeviceSighting sighting = mStabilizedDeviceRegion.get(address);
      int oldRegion = sighting.getRegion();

      sighting.setPathloss(smoothedPathLoss);
      sighting.setDistance(smoothedDistance);

      int midRssi = RangingUtils.rssiFromDistance(RangingUtils.NEAR_TO_MID_METERS, 
          calibratedTxPower);
      double midPathLoss = RangingUtils.pathLossFromRssi(midRssi, calibratedTxPower);

      int farRssi = RangingUtils.rssiFromDistance(RangingUtils.MID_TO_FAR_METERS, 
          calibratedTxPower);
      double farPathLoss = RangingUtils.pathLossFromRssi(farRssi, calibratedTxPower);

      // If the region of the beacon has changed since the last time we recorded
      // the beacon, we check to see if the change in path loss is beyond the hysteresis
      // threshold for the region. This has the effect of requiring the device
      // to change path loss by a factor significant enough to be an actual region change
      // rather than just a random fluctuation of the radio signal, and reduces the amount
      // of region transitions for beacons near the region boundaries.
      if (smoothedRegion != oldRegion) {
        switch (oldRegion) {
          case RangingUtils.Region.NEAR:
            if (smoothedPathLoss > midPathLoss + mMidHysteresisHigh) {
              sighting.setRegion(smoothedRegion);
            }
            break;
          case RangingUtils.Region.MID:
            if (smoothedPathLoss < midPathLoss - mMidHysteresisLow
                || smoothedPathLoss > farPathLoss + mFarHysteresisHigh) {
              sighting.setRegion(smoothedRegion);
            }
            break;
          case RangingUtils.Region.FAR:
            if (smoothedPathLoss < midPathLoss - mFarHysteresisLow) {
              sighting.setRegion(smoothedRegion);
            }
            break;
        }
      }
    }

    return nearestHasChanged;
  }

  /**
   * Removes the a device from the region tracking data structure.
   *
   * @return true if the device was the nearest.
   */
  public boolean onLost(String address) {
    mStabilizedDeviceRegion.remove(address);

    if (address.equals(mNearestAddress)) {
      mNearestAddress = null;
      mNearestPathLoss = 0;
      return true;
    }

    return false;
  }

  /**
   * Returns the address of the nearest device.
   */
  public String getNearestAddress() {
    return mNearestAddress;
  }

  /**
   * Returns stabilized region for that device
   */
  public int getRegion(String address) {
    if (mStabilizedDeviceRegion.containsKey(address)) {
      return mStabilizedDeviceRegion.get(address).getRegion();
    }
    return RangingUtils.Region.FAR;
  }

  /**
   * Return the current distance of the device.
   */
  public double getDistance(String address) {
    if (mStabilizedDeviceRegion.containsKey(address)) {
      return mStabilizedDeviceRegion.get(address).getDistance();
    }
    return 0.0;
  }

  /**
   * If true, the onUpdate method will always return true if a new nearest
   * beacon was found, even if it was the same as the previous nearest beacon.
   * If false, onUpdate will only return true if the new nearest was not the
   * same as the previous. This has the effect of filtering the ping-ponging
   * effect of a beacon near the boundary of the near/mid regions, from
   * repeatedly being notified as being the nearest.
   */
  public boolean getNotifyOnSameNearestDevice() {
    return mNotifyOnSameNearestDevice;
  }

  /**
   * Set the NotifyOnSameNearestDevice flag. See {@link #getNotifyOnSameNearestDevice}.
   */
  public void setNotifyOnSameNearestDevice(boolean flag) {
    mNotifyOnSameNearestDevice = flag;
  }

  private int getSmoothedRssi(String address, int rssi) {
    if (mSmoothedRssi.get(address) == null) {
      mSmoothedRssi.put(address, new WeightedAverage());
    }
    return (int) mSmoothedRssi.get(address).addValue(rssi);
  }
}