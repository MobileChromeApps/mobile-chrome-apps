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
  git log --pretty=format:'* '"$name"': %s' --topo-order --no-merges $prevhash..HEAD
  exit 0
fi

cd $(dirname $0)/..

prevtag=$(git describe --abbrev=0 HEAD)
echo "### Commits made since $prevtag ($(date "+%h %d, %Y")"
git submodule foreach --quiet $PWD'/dev-bin/release-logs.sh --submodule "$name" "$path" "$sha1" "$toplevel" '"$prevtag"
git log --pretty=format:'* cca: %s' --topo-order --no-merges $prevtag..HEAD
