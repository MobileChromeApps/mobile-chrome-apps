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

if [[ -e npm_deleted_git_ignores ]]; then
  for f in $(cat npm_deleted_git_ignores); do
    (
      cd $(dirname $f)
      echo Restoring $f
      git checkout -- $(basename $f)
    ) || exit $?
  done
  rm npm_deleted_git_ignores
  echo Restored files.
  exit 0
fi

set -e
GIT_IGNORES=$(echo $(find . -name ".gitignore"))
echo $GIT_IGNORES > npm_deleted_git_ignores
rm $GIT_IGNORES
echo Prepped for npm pack / npm publish. Deleted:
for f in $GIT_IGNORES; do echo $f; done
