#!/bin/sh
EMAIL=$(git config user.email)
git fetch origin
git log --no-merges --date=short --all-match --fixed-strings --committer="$EMAIL" --author="$EMAIL" --format="mobile-chrome-apps %h %s" --since="7 days ago" origin/master
