#!/bin/bash
EMAIL=$(git config user.email)
git fetch origin
git log --no-merges --date=short --all-match --fixed-strings --committer="$EMAIL" --author="$EMAIL" --format="mobile-chrome-apps %h %s" --since="7 days ago" origin/master
CADT=../chrome-app-developer-tool
if [[ -e "$CADT" ]]; then
  ( cd "$CADT" && git log --no-merges --date=short --all-match --fixed-strings --committer="$EMAIL" --author="$EMAIL" --format="chrome-app-developer-tool %h %s" --since="7 days ago" origin/master )
fi
for d in ../mobile-chrome-apps-plugins/*; do
  ( cd $d; git log --no-merges --date=short --all-match --fixed-strings --committer="$EMAIL" --author="$EMAIL" --format="$(basename $d) %h %s" --since="7 days ago" origin/master )
done
