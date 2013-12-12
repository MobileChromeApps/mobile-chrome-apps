
##Managing the size of node\_nodules:
Before checking in node\_modules, the directory should be cleaned to reduce its size.
The following commands remove tests and ripple, then clear out any duplicated modules.
This reduces the size of node\_modules from ~56M to ~21M

    find . -type d -iname tests -exec rm -rf {} \;
    find . -type d -iname test -exec rm -rf {} \;
    find . -type d -iname ripple-emulator -exec rm -rf {} \;
    npm dedupe

