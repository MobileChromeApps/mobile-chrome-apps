#!/bin/bash
# Copyright (c) 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# This command does a "git log $LAST_TAG..HEAD" on this repo as well as submodules.
set -e

if [[ $1 = --submodule ]]; then
  name="$2"
  path="$3"
  sha1="$4"
  toplevel="$5"
  prevtag="$6"
  cd "$toplevel"
  prevhash=$(git ls-tree $prevtag $path | awk '{print $3}')
  cd - > /dev/null
  PREFIX=$(basename $name)
  if [[ $PREFIX = cordova-android ]]; then
    PREFIX=Android
  elif [[ $PREFIX = cordova-ios ]]; then
    PREFIX=iOS
  fi
  git log --pretty=format:'* '"$PREFIX"': %s' --topo-order --no-merges $prevhash..HEAD
  echo
  exit 0
fi

cd $(dirname $0)/..

if [[ -z $1 ]]; then
  echo "Usage: $0 NEW_VERSION" >&2
  exit 1
fi
VERSION=$1

start=HEAD
if git describe v$VERSION > /dev/null 2>&1; then
  start=v$VERSION^
fi
prevtag=$(git describe --tags --abbrev=0 $start)
echo "### v$VERSION ($(date "+%h %d, %Y"))"
git log --pretty=format:'* %s' --topo-order --no-merges $prevtag..$start
echo
git submodule foreach --quiet $PWD'/dev-bin/release-logs.sh --submodule "$name" "$path" "$sha1" "$toplevel" '"$prevtag"
echo
echo
