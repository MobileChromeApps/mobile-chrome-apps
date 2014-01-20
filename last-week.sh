#!/bin/sh
EMAIL=$(git config user.email)
git fetch origin
(
  cd chrome-cordova
  git fetch origin
); (
  cd mobile-chrome-app-samples
  git fetch origin
)
git log --no-merges --date=short --all-match --fixed-strings --committer="$EMAIL" --author="$EMAIL" --format="mobile-chrome-apps %s" --since="7 days ago" origin/master
(
  cd chrome-cordova
  git log --no-merges --date=short --all-match --fixed-strings --committer="$EMAIL" --author="$EMAIL" --format="chrome-cordova %s" --since="7 days ago" origin/master
); (
  cd mobile-chrome-app-samples
  git log --no-merges --date=short --all-match --fixed-strings --committer="$EMAIL" --author="$EMAIL" --format="mobile-chrome-app-samples %s" --since="7 days ago" origin/master
)
