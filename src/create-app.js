var path = require('path');
var Q = require('q');
var fs = require('fs');
var shelljs = require('shelljs');
var xmldom = require('xmldom');
var ccaManifestLogic = require('cca-manifest-logic');

function resolveTilde(string) {
  // TODO: implement better
  if (string.substr(0,1) === '~')
    return path.resolve(process.env.HOME + string.substr(1));
  return string;
}

// Returns a promise
module.exports = exports = function createApp(destAppDir, ccaRoot, origDir, packageId, appName, flags) {
  var srcAppDir = null;
  var manifest = null;
  var appWasImported = false;
  var manifestDesktopFilename = path.join(destAppDir, 'www', 'manifest.json');
  var manifestMobileFilename = path.join(destAppDir, 'www', 'manifest.mobile.json');

  return Q.fcall(function() {
    // Validate source arg.
    var sourceArg = flags['copy-from'] || flags['link-to'];
    appWasImported = !!sourceArg;
    if (!sourceArg) {
      srcAppDir = path.join(ccaRoot, 'templates', 'default-app');
    } else {
      // Strip off manifest.json from path (its containing dir must be the root of the app)
      if (path.basename(sourceArg) === 'manifest.json') {
        sourceArg = path.dirname(sourceArg);
      }
      // Always check the sourceArg as a relative path first, even if its a special value (like 'spec')
      var dirsToTry = [ path.resolve(origDir, resolveTilde(sourceArg)) ];

      // Find the first valid path in our list (valid paths contain a manifest.json file)
      var foundManifest = false;
      for (var i = 0; i < dirsToTry.length; i++) {
        srcAppDir = dirsToTry[i];
        console.log('Searching for Chrome app source in ' + srcAppDir);
        if (fs.existsSync(path.join(srcAppDir, 'manifest.json'))) {
          foundManifest = true;
          break;
        }
      }
      if (!srcAppDir) {
        return Q.reject('Directory does not exist.');
      }
      if (!foundManifest) {
        return Q.reject('No manifest.json file found');
      }
    }
  })
  .then(function() {
    return require('./get-manifest')(srcAppDir);
  })
  .then(function(manifestData) {
    if (!(manifestData.app && manifestData.app.background && manifestData.app.background.scripts && manifestData.app.background.scripts.length)) {
      return Q.reject('No background scripts found in your manifest.json file. Your manifest must contain at least one script in the "app.background.scripts" array.');
    }
    manifest = manifestData;
  })
  .then(function() {
    // Create step.
    console.log('## Creating Your Application');
    var config_default = JSON.parse(JSON.stringify(require('./default-config')(ccaRoot)));
    config_default.lib.www = { uri: srcAppDir };
    config_default.lib.www.link = !!flags['link-to'];

    return require('./cordova-commands').runCmd(['create', destAppDir, packageId, appName, config_default]);
  })
  .then(function() {
    process.chdir(destAppDir);
  })
  .then(function() {
    if (!appWasImported) {
      // Update app name if the app is not imported.
      return Q.ninvoke(fs, 'readFile', manifestDesktopFilename, { encoding: 'utf-8' }).then(function(manifestDesktopData) {
        var manifestDesktop;
        try {
          // jshint evil:true
          manifestDesktop = eval('(' + manifestDesktopData + ')');
          // jshint evil:false
        } catch (e) {
          console.error(e);
          return Q.reject('Unable to parse manifest ' + manifestDesktopFilename);
        }
        manifestDesktop.name = appName || path.basename(destAppDir);
        manifest.name = manifestDesktop.name;
        Q.ninvoke(fs, 'writeFile', manifestDesktopFilename, JSON.stringify(manifestDesktop, null, 4));
      });
    }
  })
  .then(function() {
    // Ensure the mobile manifest exists.
    if (fs.existsSync(manifestMobileFilename)) return;
    var defaultManifestMobileFilename = path.join(ccaRoot, 'templates', 'default-app', 'manifest.mobile.json');
    if (!fs.existsSync(defaultManifestMobileFilename)) return; // TODO: Was I supposed to be an error?
    shelljs.cp('-f', defaultManifestMobileFilename, manifestMobileFilename);
  })
  .then(function() {
    // Update default packageId if needed.
    return Q.ninvoke(fs, 'readFile', manifestMobileFilename, { encoding: 'utf-8' }).then(function(manifestMobileData) {
      var newPackageId = packageId || ('com.your.company.' + (appName || manifest['name'].replace(/[^a-zA-Z0-9_]/g, '')));
      // Replace rather than parse so as to maintain comments
      manifestMobileData = manifestMobileData.replace('com.your.company.HelloWorld', newPackageId);
      return Q.ninvoke(fs, 'writeFile', manifestMobileFilename, manifestMobileData);
    });
  })
  .then(function() {
    // If there is no config.xml, or the config.xml is the cordova default, replace it with our default
    if (!appWasImported || !fs.existsSync(path.join('config.xml'))) {
      console.log("## Creating default config.xml");
      shelljs.cp('-f', path.join(ccaRoot, 'templates', 'config.xml'), path.join('config.xml'));
    }
  })
  .then(function() {
    return require('./get-manifest')('www');
  })
  .then(function(manifestJson) {
    var configXmlData = fs.readFileSync('config.xml', 'utf8');
    var analyzedManifest = ccaManifestLogic.analyseManifest(manifestJson);
    var configXmlDom = new xmldom.DOMParser().parseFromString(configXmlData);
    ccaManifestLogic.updateConfigXml(manifestJson, analyzedManifest, configXmlDom);
    configXmlData = new xmldom.XMLSerializer().serializeToString(configXmlDom);
    fs.writeFileSync('config.xml', configXmlData);
    return require('./write-out-cca-version')();
  })
  .then(function() {
    // Create scripts that update the cordova app on prepare
    fs.mkdirSync(path.join('hooks', 'before_prepare'));
    fs.mkdirSync(path.join('hooks', 'before_platform_add'));

    function writeHook(path) {
      var contents = [
          "#!/usr/bin/env node",
          "var cmdline = process.env['CORDOVA_CMDLINE'];",
          "if (!/cca/.test(cmdline)) {",
          "  var msg = 'ERROR: This is a CCA based project! Using `cordova` rather than `cca` will have unexpected results.' ;",
          "  console.error(msg);",
          "  process.exit(1);",
          "}"
          ];
      fs.writeFileSync(path, contents.join('\n'));
      fs.chmodSync(path, '777');
    }
    writeHook(path.join('hooks', 'before_prepare', 'cca-check.js'));
    writeHook(path.join('hooks', 'before_platform_add', 'cca-check.js'));
  })
  .then(function() {
    // Create a convenience gitignore
    shelljs.cp('-f', path.join(ccaRoot, 'templates', 'DEFAULT_GITIGNORE'), path.join('.', '.gitignore'));

    // Add default platforms:
    var cmds = [];
    if (flags.ios) {
      cmds.push(['platform', 'add', 'ios']);
    }
    if (flags.android) {
      cmds.push(['platform', 'add', 'android']);
    }
    return require('./cordova-commands').runAllCmds(cmds);
  })
  .then(function() {
    var wwwPath = path.join(destAppDir, 'www');
    var welcomeText = 'Done!\n\n';
    if (flags['link-to']) {
      welcomeText += 'Your project has been created, with web assets symlinked to the following chrome app:\n' +
                     wwwPath + ' --> ' + srcAppDir + '\n\n';
    } else if (flags['copy-from']) {
      welcomeText += 'Your project has been created, with web assets copied from the following chrome app:\n'+
                     srcAppDir + ' --> ' + wwwPath + '\n\n';
    } else {
      welcomeText += 'Your project has been created, with web assets in the `www` directory:\n'+
                     wwwPath + '\n\n';
    }
    welcomeText += 'Remember to run `cca prepare` after making changes if you are using an IDE.\n';
    welcomeText += 'Full instructions: https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Develop.md#making-changes-to-your-app-source-code';
    console.log(welcomeText);
  });
};
