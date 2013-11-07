var platforms = require("../platforms"),
    Q = require('q'),
    fs = require('fs');

function ActionStack() {
    this.stack = [];
    this.completed = [];
}

ActionStack.prototype = {
    createAction:function(handler, action_params, reverter, revert_params) {
        return {
            handler:{
                run:handler,
                params:action_params
            },
            reverter:{
                run:reverter,
                params:revert_params
            }
        };
    },
    push:function(tx) {
        this.stack.push(tx);
    },
    // Returns a promise.
    process:function(platform, project_dir) {
        require('../../plugman').emit('verbose', 'Beginning processing of action stack for ' + platform + ' project...');
        var project_files;

        // parse platform-specific project files once
        if (platforms[platform].parseProjectFile) {
            require('../../plugman').emit('verbose', 'Parsing ' + platform + ' project files...');
            project_files = platforms[platform].parseProjectFile(project_dir);
        }

        while(this.stack.length) {
            var action = this.stack.shift();
            var handler = action.handler.run;
            var action_params = action.handler.params;
            if (project_files) {
                action_params.push(project_files);
            }

            try {
                handler.apply(null, action_params);
            } catch(e) {
                require('../../plugman').emit('warn', 'Error during processing of action! Attempting to revert...');
                var incomplete = this.stack.unshift(action);
                var issue = 'Uh oh!\n';
                // revert completed tasks
                while(this.completed.length) {
                    var undo = this.completed.shift();
                    var revert = undo.reverter.run;
                    var revert_params = undo.reverter.params;

                    if (project_files) {
                        revert_params.push(project_files);
                    }

                    try {
                        revert.apply(null, revert_params);
                    } catch(err) {
                        require('../plugman').emit('warn', 'Error during reversion of action! We probably really messed up your project now, sorry! D:');
                        issue += 'A reversion action failed: ' + err.message + '\n';
                    }
                }
                e.message = issue + e.message;
                return Q.reject(e);
            }
            this.completed.push(action);
        }
        require('../../plugman').emit('verbose', 'Action stack processing complete.');

        if (project_files) {
            require('../../plugman').emit('verbose', 'Writing out ' + platform + ' project files...');
            project_files.write();
        }

        return Q();
    }
};

module.exports = ActionStack;
