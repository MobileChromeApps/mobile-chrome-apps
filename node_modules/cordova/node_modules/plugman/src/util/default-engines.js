var path = require('path');

module.exports = function(project_dir){
    return {
        'cordova': 
            { 'platform':'*', 'scriptSrc': path.join(project_dir,'cordova','version') },   
        // no location needed for plugman as this should be the calling process
        'cordova-plugman': 
            { 'platform':'*', 'currentVersion': process.version },
        'cordova-android': 
            { 'platform':'android', 'scriptSrc': path.join(project_dir,'cordova','version') },
        'cordova-ios': 
            { 'platform':'ios', 'scriptSrc': path.join(project_dir,'cordova','version') },
        'cordova-blackberry10': 
            { 'platform':'blackberry10', 'scriptSrc': path.join(project_dir,'cordova','version') },
        'cordova-wp7': 
            { 'platform':'wp7', 'scriptSrc': path.join(project_dir,'cordova','version') },
        'cordova-wp8': 
            { 'platform':'wp8', 'scriptSrc': path.join(project_dir,'cordova','version') },
        'cordova-windows8': 
            { 'platform':'windows8', 'scriptSrc': path.join(project_dir,'cordova','version') },
        'apple-xcode' : 
            { 'platform':'ios', 'scriptSrc':  path.join(project_dir,'cordova','apple_xcode_version') },
        'apple-ios' : 
            { 'platform':'ios', 'scriptSrc': path.join(project_dir,'cordova','apple_ios_version') },
        'apple-osx' : 
            { 'platform':'ios', 'scriptSrc': path.join(project_dir,'cordova','apple_osx_version') },
        'blackberry-ndk' : 
            { 'platform':'blackberry10', 'scriptSrc': path.join(project_dir,'cordova','bb10-ndk-version') },
        'android-sdk' : 
            { 'platform':'android', 'scriptSrc': path.join(project_dir,'cordova','android_sdk_version') },
        'windows-os' : 
            { 'platform':'wp7|wp8|windows8', 'scriptSrc': path.join(project_dir,'cordova','win_os_version') },
        'windows-sdk' : 
            { 'platform':'wp7|wp8|windows8', 'scriptSrc': path.join(project_dir,'cordova','win_sdk_version') }        
    }
};
