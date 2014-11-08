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
 * Given a streaming input of values (could be distance, pathLoss, rssi,
 * or any other value we want to smooth), perform a smoothing filter to reduce
 * signal noise.
 * <p>
 * This computes the smoothed value using an exponential moving average filter.
 */
public class WeightedAverage {
  private double mSmoothFactor;
  private double mLastValue;
  private double mSmoothedValue;
  private boolean mReset;

  public WeightedAverage() {
    mSmoothFactor = 0.5;
    mSmoothedValue = 0.0;
    mLastValue = 0.0;
    mReset = true;
  }

  /**
   * Set the current value, which contributes to the calculated smoothed value.
   */
  public double addValue(double value) {
    mLastValue = value;

    // Using exponential moving average smoothing.
    // Initialize with the first sample.
    if (mReset) {
      mSmoothedValue = mLastValue;
      mReset = false;
    } else {
      mSmoothedValue = mSmoothFactor * mLastValue
          + (1.0 - mSmoothFactor) * mSmoothedValue;
    }

    return mSmoothedValue;
  }

  /**
   * Returns the calculated smoothed value.
   */
  public double getValue() {
    return mSmoothedValue;
  }
}
