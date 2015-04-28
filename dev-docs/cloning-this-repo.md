## Install the latest `cca` from source

```
git clone --recursive https://github.com/MobileChromeApps/mobile-chrome-apps
cd mobile-chrome-apps
npm link cca-manifest-logic/
npm link
# Clone all plugins:
./dev-bin/git-up.js
```

## Update source to pick up latest changes

Preferrably, just run:

```
./dev-bin/git-up.js
```

But if you cannot get that to work, you can just manually:

```
git pull
git submodule update --init --recursive
npm install
```

Note: the `git-up.js` script takes care of a lot more.

## Resetting to the latest released `cca` version from npm

If you ran `npm link`, you can reset your global `cca` version to the release at any time by running:

```
npm install -g cca
```

