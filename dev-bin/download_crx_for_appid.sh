#!/bin/bash
# Copyright (c) 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 APP_ID"
  exit;
fi

APPID=$1

#wget "https://clients2.google.com/service/update2/crx?response=redirect&x=id%3D${APPID}%26uc" -O "${APPID}.crx"
curl -L "https://clients2.google.com/service/update2/crx?response=redirect&x=id%3D${APPID}%26uc" -o "${APPID}.crx"
