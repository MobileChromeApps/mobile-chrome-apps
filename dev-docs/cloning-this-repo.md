## Install the latest `cca` from source

```
git clone --recursive https://github.com/MobileChromeApps/mobile-chrome-apps
cd mobile-chrome-apps
npm install
npm link  # optional step
```

The optional `npm link` step will add your link your global `cca` install to this local checkout.

## Update source to pick up latest changes

```
cd mobile-chrome-apps
git pull
git submodule update --init --recursive
npm install
```

## Resetting to the latest released `cca` version from npm

If you ran `npm link`, you can reset your global `cca` version to the release at any time by running:

```
npm install -g cca
```

