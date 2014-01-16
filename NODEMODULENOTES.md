##Managing the size of `node_nodules`:
Before checking in `node_modules`, the directory should be cleaned to reduce its size.
The following commands remove tests.

    find node_modules -type d -iname tests -exec rm -rf {} \;
    find node_modules -type d -iname test -exec rm -rf {} \;
    git add --all node_modules/cordova

