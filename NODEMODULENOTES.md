##Managing the size of `node_nodules`:
Before checking in `node_modules`, the directory should be cleaned to reduce its size.
The following commands remove tests and ripple, then clear out any duplicated modules.
This reduces the size of `node_modules` from ~56M to ~21M

    npm dedupe
    find node_modules -type d -iname tests -exec rm -rf {} \;
    find node_modules -type d -iname test -exec rm -rf {} \;
    find node_modules -type d -iname ripple-emulator -exec rm -rf {} \;
    git add --all node_modules

