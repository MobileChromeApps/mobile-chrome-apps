#!/bin/bash
# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

FILE="$1"
GIT_ADD="$2"

if [[ ! -f "$FILE" ]]; then
  echo "Skipping pre-commit check for missing file: $FILE"
  exit 0
fi
# Ignore binary files.
( file --mime "$FILE" | grep charset=binary >/dev/null ) && exit 0
# Ignore third_party.
[[ "$FILE" = *third_party* ]] && exit 0
# Ignore markdown
[[ "$FILE" = *.md ]] && exit 0
# Ignore .gitignore
[[ "$FILE" = .gitignore ]] && exit 0

# Find files with trailing whitespace
if grep -E '\s+$' "$FILE"; then
  echo -n "Fixing whitespace in $FILE"
fi
# Fix up trailing white-space & extra lines at EOF.
if sed -i '' 's/[  ]*$//' "$FILE" && \
    sed -i '' -e ':a' -e '/^\n*$/{$d;N;ba' -e '}' "$FILE"; then
  if [[ -n $GIT_ADD ]]; then
    git add "$FILE"
  fi
fi

# Ignore assets for license header.
[[ "$FILE" = *assets/* ]] && exit 0
echo checking $FILE
if ! head "$FILE" | grep 'The Chromium Authors' > /dev/null; then
  echo "Missing license header: $FILE"
  exit 1
fi
exit 0
