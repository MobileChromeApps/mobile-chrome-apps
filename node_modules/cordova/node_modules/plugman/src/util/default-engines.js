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
            { 'platform':'wp7', 'scriptSrc': path.join(project_dir,'cordova','version.bat') },
        'cordova-wp8': 
            { 'platform':'wp8', 'scriptSrc': path.join(project_dir,'cordova','version.bat') },
        'cordova-windows8': 
            { 'platform':'windows8', 'scriptSrc': path.join(project_dir,'cordova','version.bat') },
        
        // TODO: these scripts have not been made!
        'apple-xcode' : 
            { 'platform':'ios', 'scriptSrc':  path.join(project_dir,'cordova','apple-xcode-version') },
        'apple-ios' : 
            { 'platform':'ios', 'scriptSrc': path.join(project_dir,'cordova','apple-ios-version') },
        'blackberry-webworks' : 
            { 'platform':'blackberry10', 'scriptSrc': path.join(project_dir,'blackberry-webworks-version') },
        'android-sdk' : 
            // will have to parse string output from android list targets
            { 'platform':'android', 'scriptSrc': path.join(project_dir,'cordova','android-sdk-version') }
    }
};
