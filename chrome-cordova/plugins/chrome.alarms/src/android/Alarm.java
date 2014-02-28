// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium;

import android.os.Parcel;
import android.os.Parcelable;

public class Alarm implements Parcelable {
     public String name;
     public long scheduledTime;
     public long periodInMillis;

     public Alarm(String name, long scheduledTime, long periodInMillis) {
         this.name = name;
         this.scheduledTime = scheduledTime;
         this.periodInMillis = periodInMillis;
     }

     public int describeContents() {
         return 0;
     }

     public void writeToParcel(Parcel out, int flags) {
         out.writeString(name);
         out.writeLong(scheduledTime);
         out.writeLong(periodInMillis);
     }

     public static final Parcelable.Creator<Alarm> CREATOR = new Parcelable.Creator<Alarm>() {
         public Alarm createFromParcel(Parcel parcel) {
             String name = parcel.readString();
             long scheduledTime = parcel.readLong();
             long periodInMillis = parcel.readLong();
             return new Alarm(name, scheduledTime, periodInMillis);
         }

         public Alarm[] newArray(int size) {
             return new Alarm[size];
         }
     };
}

