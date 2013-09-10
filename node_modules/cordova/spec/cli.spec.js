var CLI = require("../src/cli");
    cordova = require("../cordova");

describe("cordova cli", function () {

    describe("options", function () {
        describe("version", function () {
            var version = require("../package").version;
            beforeEach(function () {
                spyOn(console, "log");
            });

            it("will spit out the version with -v", function () {
                new CLI(["-v"]);
                expect(console.log).toHaveBeenCalledWith(version);
            });

            it("will spit out the version with --version", function () {
                new CLI(["--version"]);
                expect(console.log).toHaveBeenCalledWith(version);
            });

            it("will spit out the version with -v anywher", function () {
                new CLI(["one", "-v", "three"]);
                expect(console.log).toHaveBeenCalledWith(version);
            });
        });
    });

    describe("project commands other than plugin and platform", function () {
        beforeEach(function () {
            spyOn(cordova, "build");
        });

        afterEach(function () {
            cordova.removeAllListeners();
        });

        it("will call command with all arguments passed through", function () {
            new CLI(["node", "cordova", "build", "blackberry10", "-k", "abcd1234"]);
            expect(cordova.build).toHaveBeenCalledWith({verbose: false, platforms: ["blackberry10"], options: ["-k", "abcd1234"]});
        });

        it("will consume the first instance of -d", function () {
            new CLI(["node", "cordova", "-d", "build", "blackberry10", "-k", "abcd1234", "-d"]);
            expect(cordova.build).toHaveBeenCalledWith({verbose: true, platforms: ["blackberry10"], options: ["-k", "abcd1234", "-d"]});
        });

        it("will consume the first instance of --verbose", function () {
            new CLI(["node", "cordova", "--verbose", "build", "blackberry10", "-k", "abcd1234", "--verbose"]);
            expect(cordova.build).toHaveBeenCalledWith({verbose: true, platforms: ["blackberry10"], options: ["-k", "abcd1234", "--verbose"]});
        });

        it("will consume the first instance of either --verbose of -d", function () {
            new CLI(["node", "cordova", "--verbose", "build", "blackberry10", "-k", "abcd1234", "-d"]);
            expect(cordova.build).toHaveBeenCalledWith({verbose: true, platforms: ["blackberry10"], options: ["-k", "abcd1234", "-d"]});
        });

        it("will consume the first instance of either --verbose of -d", function () {
            new CLI(["node", "cordova", "-d", "build", "blackberry10", "-k", "abcd1234", "--verbose"]);
            expect(cordova.build).toHaveBeenCalledWith({verbose: true, platforms: ["blackberry10"], options: ["-k", "abcd1234", "--verbose"]});
        });
    });

    describe("plugin", function () {
        beforeEach(function () {
            spyOn(cordova, "plugin");
        });

        afterEach(function () {
            cordova.removeAllListeners();
        });

        it("will call command with all arguments passed through", function () {
            new CLI(["node", "cordova", "plugin", "add", "facebook", "--variable", "FOO=foo"]);
            expect(cordova.plugin).toHaveBeenCalledWith("add", ["facebook", "--variable", "FOO=foo"]);
        });
    });
});
