#!/bin/bash
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

function delete_git_ignores() {
  GIT_IGNORES=$(echo $(find . -name ".gitignore" | grep -v "node_modules"))
  echo $GIT_IGNORES > npm_deleted_git_ignores
  rm $GIT_IGNORES
}

function restore_git_ignores() {
  for f in $(cat npm_deleted_git_ignores); do
    (
      cd $(dirname $f)
      echo Restoring $f
      git checkout -- $(basename $f)
    ) || exit $?
  done
  rm npm_deleted_git_ignores
}

set -e
set -x
cd $(dirname $0)/..
if [[ -n "$(git status --porcelain)" ]]; then
  echo "********** Changes exist. aborting. ************"
  git status
  exit 1
fi
delete_git_ignores
npm pack
TMP_DIR=tmp-$RANDOM
mkdir $TMP_DIR
cd $TMP_DIR
tar xzf ../*.tgz
# This is the main reason for this script.
if [[ ! -e package/cordova/cordova-android/node_modules ]]; then
  cp -r ../cordova/cordova-android/node_modules package/cordova/cordova-android
  cp -r ../cordova/cordova-ios/bin/node_modules package/cordova/cordova-ios/bin
fi
tar czf foo.tgz package
mv foo.tgz ../*.tgz
cd ..
rm -r $TMP_DIR
restore_git_ignores
echo DONE

