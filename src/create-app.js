var path = require('path');
var Q = require('q');
var fs = require('fs');
var shelljs = require('shelljs');

var utils = require('./utils');

module.exports = exports = function createApp(destAppDir, ccaRoot, origDir, flags) {
  var srcAppDir = null;
  var manifest = null;

  var isGitRepo = fs.existsSync(path.join(__dirname, '..', '.git')); // git vs npm

  function resolveTilde(string) {
    // TODO: implement better
    if (string.substr(0,1) === '~')
      return path.resolve(process.env.HOME + string.substr(1));
    return string;
  }

  // Validate source arg.
  sourceArg = flags['copy-from'] || flags['link-to'];
  if (!sourceArg) {
    srcAppDir = path.join(ccaRoot, 'templates', 'default-app');
  } else {
    // Strip off manifest.json from path (its containing dir must be the root of the app)
    if (path.basename(sourceArg) === 'manifest.json') {
      sourceArg = path.dirname(sourceArg);
    }
    // Always check the sourceArg as a relative path, even if its a special value (like 'spec')
    var dirsToTry = [ path.resolve(origDir, resolveTilde(sourceArg)) ];

    // Special values for sourceArg we resolve to predefined locations
    if (sourceArg === 'spec') {
      dirsToTry.push(path.join(ccaRoot, 'chrome-cordova', 'chrome-apps-api-tests'));
    } else if (sourceArg === 'oldspec') {
      dirsToTry.push(path.join(ccaRoot, 'chrome-cordova', 'spec', 'www'));
    } else if (sourceArg === 'default') {
      dirsToTry.push(path.join(ccaRoot, 'templates', 'default-app'));
    }

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

  // Get the manifest.
  return require('./get-manifest')(srcAppDir).then(function(manifestData) {
    if (!(manifestData.app && manifestData.app.background && manifestData.app.background.scripts && manifestData.app.background.scripts.length)) {
      fatal('No background scripts found in your manifest.json file. Your manifest must contain at least one script in the "app.background.scripts" array.');
    }
    manifest = manifestData;
    return Q.when(require('./parse_manifest')(manifest));
  })
  .then(require('./tools-check'))

  // Create step.
  .then(function(toolsCheckResults) {
    console.log('## Creating Your Application');
    var config_default = JSON.parse(JSON.stringify(require('./default-config')(ccaRoot)));
    config_default.lib.www = { uri: srcAppDir };
    config_default.lib.www.link = !!flags['link-to'];

    return require('./cordova-commands').runCmd(['create', destAppDir, manifest.name, manifest.name, config_default]);
  }).then(function() {
    process.chdir(destAppDir);
    console.log("Generating config.xml from manifest.json");
    // TODO(mmocny): if cordova support --link-to/--opy-from to root folders, i.e. apps with existing config.xml, won't this overwrite a good config.xml?
    return Q.ninvoke(fs, 'readFile', path.join(ccaRoot, 'templates', 'config.xml'), {encoding: 'utf-8'});
  }).then(function(data) {
    var configfile = data
        .replace(/__APP_NAME__/, (manifest.name) || "Your App Name")
        .replace(/__APP_PACKAGE_ID__/, (manifest.packageId) || "com.your.company.HelloWorld")
        .replace(/__APP_VERSION__/, (manifest.version) || "0.0.1")
        .replace(/__DESCRIPTION__/, (manifest.description) || "Plain text description of this app")
        .replace(/__AUTHOR__/, (manifest.author) || "Author name and email");
    return Q.ninvoke(fs, 'writeFile', 'config.xml', configfile, { encoding: 'utf-8' });
  }).then(function() {
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
    return require('./write-out-cca-version')();
  })
  .then(function() {
    // Create scripts that update the cordova app on prepare
    fs.mkdirSync(path.join('hooks', 'before_prepare'));
    fs.mkdirSync(path.join('hooks', 'after_prepare'));

    function writeHook(path, ccaArg) {
      var contents = [
          '#!/usr/bin/env node',
          'var child_process = require("child_process");',
          'var fs = require("fs");',
          'var isWin = process.platform.slice(0, 3) === "win";',
          'var cmd = isWin ? "cca.cmd" : "cca";',
          'if (!isWin && fs.existsSync(cmd)) { cmd = "./" + cmd }',
          'var p = child_process.spawn(cmd, ["' + ccaArg + '"], { stdio:"inherit" });',
          'p.on("close", function(code) { process.exit(code); });',
          ];
      fs.writeFileSync(path, contents.join('\n'));
      fs.chmodSync(path, '777');
    }
    writeHook(path.join('hooks', 'before_prepare', 'cca-pre-prepare.js'), 'pre-prepare');
    writeHook(path.join('hooks', 'after_prepare', 'cca-post-prepare.js'), 'post-prepare');

    // Create a convenience link to cca
    if (isGitRepo || !shelljs.which('cca')) {
      var ccaPath = path.relative('.', path.join(ccaRoot, 'src', 'cca.js'));
      var comment = 'Feel free to rewrite this file to point at "cca" in a way that works for you.';
      fs.writeFileSync('cca.cmd', 'REM ' + comment + '\r\nnode "' + ccaPath.replace(/\//g, '\\') + '" %*\r\n');
      fs.writeFileSync('cca', '#!/bin/sh\n# ' + comment + '\nexec "$(dirname $0)/' + ccaPath.replace(/\\/g, '/') + '" "$@"\n');
      fs.chmodSync('cca', '777');
    }
  })
  .then(function() {
    // Create a convenience gitignore
    shelljs.cp('-f', path.join(ccaRoot, 'templates', 'DEFAULT_GITIGNORE'), path.join('.', '.gitignore'));
    return Q();
  })

  // Ensure the mobile manifest exists.
  .then(function() {
    var manifestMobileFilename = path.join('www', 'manifest.mobile.json');
    if (fs.existsSync(manifestMobileFilename)) return;
    var defaultManifestMobileFilename = path.join(ccaRoot, 'templates', 'default-app', 'manifest.mobile.json');
    if (!fs.existsSync(defaultManifestMobileFilename)) return; // TODO: Was I supposed to be an error?
    shelljs.cp('-f', defaultManifestMobileFilename, manifestMobileFilename);
  })

  // Run prepare.
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
    welcomeText += 'Remember to run `cca prepare` after making changes\n';
    welcomeText += 'Full instructions: https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Develop.md#making-changes-to-your-app-source-code';
    console.log(welcomeText);

    return Q();
  });
};
