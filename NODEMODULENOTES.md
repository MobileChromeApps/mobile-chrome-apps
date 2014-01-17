# How to update node_modules:

    rm -rf node_modules
    npm install
    find node_modules -type d -iname tests -exec rm -rf {} \;
    find node_modules -type d -iname tests -exec rm -rf {} \;
    find node_modules -type d -iname test -exec rm -rf {} \;
    find node_modules -type d -iname test -exec rm -rf {} \;
    git add --all node_modules/cordova

