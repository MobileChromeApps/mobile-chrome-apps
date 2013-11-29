$(document).ready(function () {
    module("jWorkflow ordering and starting workflows");

    test("jWorkflow: we can place an order", function () {
        expect(1);
        var order = jWorkflow.order(function () {});
        ok(order, "we should have an order");
    });

    test("jWorkflow: order throws an error when not given a function", function () {
        expect(1);
        var errored = false;
        try {
            jWorkflow.order(42);
        } 
        catch (ex) {
            errored = true;
        }

        ok(errored, "expected an error");

    });

    test("jWorkflow: we can call andThen on the return value of order", function () {
        expect(2);

        var transfunctioner = function () { },
            order = jWorkflow.order(transfunctioner);
        
        ok(order.andThen, "expected to be asked: 'andThen'");
        equals(typeof(order.andThen), "function", "expected andThen to be a function");
    });

    test("jWorkflow: andThen throws an error when not given a function", function () {
        expect(1);

        var errored = false;
        try {
            jWorkflow.order(function () {}).andThen(42);
        } 
        catch (ex) {
            errored = true;
        }

        ok(errored, "expected an error");
        
    });

    test("jWorkflow: we can call andThen on the return value of andThen", function () {
        expect(2);

        var garlicChicken = function () {},
            whiteRice = function () {},
            wontonSoup = function () {},
            cookiesFortune = function () {},
            noAndThen = function () {},
            order = jWorkflow.order(garlicChicken)
                            .andThen(whiteRice)
                            .andThen(wontonSoup)
                            .andThen(cookiesFortune);
        
        order.andThen(noAndThen).andThen(noAndThen);

        ok(order.andThen, "expected to be asked: 'andThen'");
        equals(typeof(order.andThen), "function", "expected andThen to be a function");

    });

    test("jWorkflow: it doesnt invoke the order function when start isnt called", function () {
        var dude = true,
            sweet = function () { 
                dude = false; 
            },
            order = jWorkflow.order(sweet);

        ok(dude, "expected sweet to have not been invoked");
        
    });

    test("jWorkflow: it calls the order function when start is called", function () {
        var dude = false,
            sweet = function () { 
                dude = true; 
            },
            order = jWorkflow.order(sweet);

        order.start();

        ok(dude, "expected sweet to have been invoked");
    });

    asyncTest("jWorkflow: it can handle multiple orders without mixing them", function () {
        expect(1);
        var dude = false,
            what = false,
            sweet = function () { 
                dude = true; 
            },
            whatup = function () { 
                what = true; 
            },
            order = jWorkflow.order(sweet),
            order2 = jWorkflow.order(whatup);


        order.start(function () {
            start();
            ok(what === false, "whatup shouldn't have been called");
        });
    });

    test("jWorkflow: it calls the order in the order that it was built", function () {
        expect(1);

        var result = [], 
            garlicChicken = function () { 
                result.push("garlicChicken"); 
            },
            whiteRice = function () { 
                result.push("whiteRice"); 
            },
            wontonSoup = function () { 
                result.push("wontonSoup"); 
            },
            cookiesFortune = function () { 
                result.push("cookiesFortune"); 
            },
            noAndThen = function () { 
                result.push("noAndThen"); 
            },
            order = jWorkflow.order(garlicChicken)
                            .andThen(whiteRice)
                            .andThen(wontonSoup)
                            .andThen(cookiesFortune);
        
        order.andThen(noAndThen).andThen(noAndThen);

        order.start();

        same(["garlicChicken", "whiteRice", "wontonSoup", "cookiesFortune", "noAndThen", "noAndThen"], result, "expected functions to be called in order");
    });

    test("jWorkflow: it get the return value of the previous func", function () {

        var dude = function () { 
                return 42; 
            },
            sweet = function (previous) { 
                equals(previous, 42, "expected previous to be return value"); 
            },
            order = jWorkflow.order(dude).andThen(sweet);

        order.start();

    });

    test("jWorkflow: we get a baton play with", function () {
        var order = jWorkflow.order(function (previous, baton) {
            ok(baton, "expected a baton");
            ok(baton.take, "expected to be able to take the baton");
            ok(baton.pass, "expected to be able to pass the baton");
        });

        order.start();

    });

    test("jWorkflow: when I take the baton, the next methods are not called if I don't pass it", function () {
        var transfunctioner = true,
        dude = function () {},
        sweet = function () {},
        noAndThen = function (previous, baton) {
            baton.take();
        },
        fortuneCookie = function () { 
            transfunctioner = false; 
        },
        order = jWorkflow.order(dude).andThen(sweet).andThen(noAndThen).andThen(fortuneCookie);

        order.start();

        ok(transfunctioner, "fortune Cookie should not have been called because we took the baton and didn't pass it");
    });

    asyncTest("jWorkflow: when I take the baton and pass it async, the next methods are called", function () {
        expect(1);
        var transfunctioner = false,
        dude = function () {},
        sweet = function () {},
        noAndThen = function (previous, baton) {
            baton.take();
            window.setTimeout(function () {
                baton.pass();
            }, 10);
        },
        fortuneCookie = function () { 
            transfunctioner = true; 
        },
        order = jWorkflow.order(dude).andThen(sweet).andThen(noAndThen).andThen(fortuneCookie);

        order.start(function () {
            start();
            ok(transfunctioner, "fortune Cookie should have been called because we passed the baton");
        });

    });

    asyncTest("jWorkflow: it calls the order in the order that it was built, even with Async calls", function () {
        expect(1);

        var result = [], 
            procrastinate = function (msg, baton) { 
                baton.take();
                window.setTimeout(function () {
                    result.push(msg); 
                    baton.pass();
                }, 10);
            },
            garlicChicken = function (previous, baton) { 
                procrastinate("garlicChicken", baton); 
            },
            whiteRice = function (previous, baton) { 
                result.push("whiteRice");
            },
            wontonSoup = function (previous, baton) { 
                procrastinate("wontonSoup", baton); 
            },
            cookiesFortune = function (previous, baton) { 
                result.push("cookiesFortune"); 
            },
            noAndThen = function (previous, baton) { 
                procrastinate("noAndThen", baton); 
            },
            order = jWorkflow.order(garlicChicken)
                            .andThen(whiteRice)
                            .andThen(wontonSoup)
                            .andThen(cookiesFortune);
        
        order.andThen(noAndThen).andThen(noAndThen);

        order.start(function () {
            start();
            same(result, ["garlicChicken", "whiteRice", "wontonSoup", "cookiesFortune", "noAndThen", "noAndThen"], "expected functions to be called in order");
        });
    });

    test("jWorkflow: we can give context for the function passed to andThen", function () {
        expect(1);

        var zoltan = {
                toMyParentsMinivan: function () {
                    ok(this.getCultMembers, "expected to be able to get the cult members");
                },

                getCultMembers: function () {
                    return ["Zarnoff", "Zabu", "Zellnor", "Zelbor", "Zelmina", "Jeff"];
                }
            },
            order = jWorkflow.order(zoltan.toMyParentsMinivan, zoltan);

        order.start();
    });

    test("jWorkflow, we can pass in a different context for each function", function () {
        expect(2);
        
        var jesse = { 
                smokeyMcPot: true,
                test: function () {
                    ok(this.smokeyMcPot, "I should be SmokeyMcPot");
                }
            },
            chester = {
                johnnyPotsmoker: true,
                test: function () {
                    ok(this.johnnyPotsmoker, "I should be Johnny Potsmoker");
                }
            },
            order = jWorkflow.order(jesse.test, jesse)
                             .andThen(chester.test, chester);

         
        order.start();


    });

    test("jWorkflow: we can pass context into start", function () {
        expect(1);

        var jesse = { 
                smokeyMcPot: true,
                test: function () {
                    ok(this.smokeyMcPot, "I should be SmokeyMcPot");
                }
            },
            order = jWorkflow.order();

        order.start(jesse.test, jesse);
    });

    test("jWorkflow, we can pass null into order", function () {
        expect(1);

        var order = jWorkflow.order();

        ok(order, "expected to have an order when not passing in an initial function");
    });

    test("jWorkflow, we can NOT pass null into andThen", function () {
        expect(1);
        var errored = false,
            order = jWorkflow.order();

        try {
            order.andThen();
        } 
        catch (ex) {
            errored = true;
        }

        ok(errored, "expected an exception when calling andThen with no order");
    });

    asyncTest("jWorkflow, we can pass a return value from an async function into a sync function via the baton", function () {
        expect(1);
       
        var correct,
            was,
            order = jWorkflow.order(function (previous, baton) {
                baton.take();
                setTimeout(function () {
                    baton.pass(420);
                }, 10);

                return 11;

            }).andThen(function (answer) {
                was = answer;
                correct = answer === 420;
            });

        order.start(function () {
            start();
            ok(correct, "expected it to be 420 but was " + was);
        });
    });

    asyncTest("jWorkflow, we can reuse an order", function () {
        expect(1);

        var sheep_teleported = 0,
            teleport = function () {
                sheep_teleported += 1;
            },
            order = jWorkflow.order(teleport).andThen(teleport);


        order.start(function () {
            order.start(function () {
                start();
                equals(sheep_teleported, 4, "expected to teleport 4 sheep");
            });
        });
    });

    asyncTest("jWorkflow, we can chill for a little bit between tasks", function () {
        var time = [],
            inhale = function () {
                time.push(new Date());
            },
            exhale = inhale;

        jWorkflow.order(inhale).chill(100).andThen(exhale).start(function () {
            start();
            var chilled = time[1] - time[0];
            ok(chilled > 50, "expected to chill a little bit between tasks: " + chilled);
        });
    });

    test("jWorkflow, it passes the final result to the callback passed to start", function () {
        expect(1);
        var plus1 = function (prev) {
                return prev + 1;
            };

        jWorkflow.order(function () {
                    return 0;
                 })
                 .andThen(plus1)
                 .andThen(plus1)
                 .start(function (result) {
                     equals(2, result);
                 });
    });

    test("jWorkflow, we can pass the initial value into start", function () {
        expect(1);

        jWorkflow.order().andThen(function (prev) {
            equals(5, prev);
        }).start({
            initialValue: 5
        });
    });

    asyncTest("jWorkflow, we can pass another workflow into andThen", function () {
        expect(1);
       
        var plus1 = function (prev) {
                return prev + 1;
            },
            plus4 = function (prev, baton) {
                baton.take();
                setTimeout(function () {
                    baton.pass(prev + 4);
                }, 10);
            },
            addTen = jWorkflow.order(plus4).andThen(plus1).andThen(plus4).andThen(plus1),
            addFive = jWorkflow.order(plus4).andThen(plus1);

        jWorkflow.order()
                 .andThen(addTen)
                 .andThen(addTen)
                 .andThen(addFive)
                 .start({
                    callback: function (result) {
                        start();
                        equals(result, 25);
                    },
                    initialValue: 0
                 });
    });

    asyncTest("jWorkflow, we can pass an array of functions into andThen", function () {
        expect(1);

        var x = "",
            w = function (letter, delay) {
                return function (prev, baton) {
                    if (delay) {
                        baton.take();
                        window.setTimeout(function () {
                            x += letter;
                            baton.pass();
                        }, delay);
                    }
                    else {
                        x += letter;
                    }
                };
            };

        jWorkflow.order(w("d"))
                 .andThen([w("U", 100), w("u", 10), w("u")])
                 .andThen(w("de"))
                 .start(function () {
                     start();
                     equals(x, "duuUde");
                 });

    });

    asyncTest("jWorkflow, we can pass an array of workflows into andThen", function () {
        expect(1);

        var x = "",
            w = function (letter, delay) {
                return function (prev, baton) {
                    if (delay) {
                        baton.take();
                        window.setTimeout(function () {
                            x += letter;
                            baton.pass();
                        }, delay);
                    }
                    else {
                        x += letter;
                    }
                };
            };

        jWorkflow.order(jWorkflow.order(w("s")))
                 .andThen([jWorkflow.order(w("w", 1)).andThen(w("e")), jWorkflow.order(w("e", 30))])
                 .andThen(w("et"))
                 .start(function () {
                     start();
                     equals(x, "sweeet");
                 });
    });

    asyncTest("jWorkflow, we can stop execution of a workflow with baton.drop", function () {
        expect(2);

        var inc = function (prev, baton) {
                if (prev >= 3) {
                    baton.drop(prev);
                }
                return ++prev;
            },
            protected = false;

        jWorkflow.order(inc)
                 .andThen(inc)
                 .andThen(inc)
                 .andThen(inc)
                 .andThen(inc)
                 .andThen(inc)
                 .andThen(function (prev) {
                     protected = true;
                     return prev;
                 }).start({
                     initialValue: 0,
                     callback: function (result) {
                         start();
                         equals(protected, false);
                         equals(result, 3);
                     }
                 });
    });
});
