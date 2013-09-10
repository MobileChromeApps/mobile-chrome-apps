# Changelog

## 0.11.0

### Features

- Windows phone support
- Track download counts from the plugin registry [CB-4492](https://issues.apache.org/jira/browse/CB-4492)
- Plugin URLs can now be specified with a hash giving a git ref and subdirectory, as in `https://github.com/foo/bar.git#gitref:sub/dir`. Both parts are optional: `.../bar.git#gitref` and `.../bar.git#:sub/dir` both work. [CB-4622](https://issues.apache.org/jira/browse/CB-4622)
- Engine data is now stored in the registry, and Plugman will not install plugins your Cordova version cannot support. [CB-4494](https://issues.apache.org/jira/browse/CB-4494)
- `<lib-file>` tags are now allowed on Android. [CB-4430](https://issues.apache.org/jira/browse/CB-4430)

### Bugfixes

- `plugin rm` now doesn't choke when a file is already deleted
- Fixed some trouble with filesystem paths vs. web paths; improves Windows host support.
- Projects beginning with `x`, `y`, and `z` now work. [CB-4502](https://issues.apache.org/jira/browse/CB-4502)
