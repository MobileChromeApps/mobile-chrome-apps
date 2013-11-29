# jWorkflow
Dude, where is my workflow?

jWorkflow is a workflow engine for JavaScript that provides the ability to
create workflows to chain methods together in an easy to understand syntax:

    var fooodOrder = jWorkflow.order(garlicChicken)
                              .andThen(whiteRice)
                              .andThen(wontonSoup)
                              .andThen(cookiesFortune)
                              .andThen(noAndThen)
                              .andThen(noAndThen)
                              .andThen(noAndThen)
                              .andThen(noAndThen);

    fooodOrder.start();

# Install

jWorkflow can be used in node or included in the browser.  It can be installed with npm

    npm install jWorkflow

and used

    var jWorkflow = require("jWorkflow");

or just include jWorkflow.js in your webpage and use window.jWorkflow.

# Usage

jWorkflow orders are started with a call to jWorkflow.order:

    function dude() {
        // some of the best code in the world will live here
    }

    var order = jWorkflow.order(dude);

    // orders can also be started with no initial function
    var pizzacoli = jWorkflow.order();

jWorkflow tasks at the root are just functions that will be invoked in the order they are built.
Any number of tasks can be then appended to the order:

    order.andThen(sweet).andThen(dude).andThen(sweet);

The functions passed into the order will not be invoked until you call:

    order.start();

The context to be used when invoking the functions can be passed in while creating the order:

    order.andThen(transfunctioner.photonAcceleratorAnnihilationBeam, transfunctioner);

An initial value can be passed into the start method to seed the first function:

    order.start({
        initialValue: 10
    });

# Passing Values between tasks

jWorkflow tasks can access the return value of the previous task with the previous parameter:

    function meaningOfLife() {
       //find the meaning of life
       return 42; 
    }
    
    function writeBook(previous) {
       console.log("the meaning of life is " + previous);
    }

    var guide = jWorkflow.order(meaningOfLife).andThen(writeBook);
    guide.start();

# Handling Async calls

Sometimes(probably all the time) you will need to do something async when working with
tasks, jWorkflow provides the ability to control the execution of the workflow via a
baton that is passed to the task

    function procrastinate(previous, baton) {
        //take the baton, this means the next task will not run until you pass the baton
        baton.take();

        window.setTimeout(function() {
            //do some stuff

            //please be nice and always remember to pass the baton!
            baton.pass();
        }, 1000);
    }

If you want to pass a return value to the next task you can pass it along with the
baton.

NOTE: if you did take the baton, the return value from your function will NOT be passed to 
the next task:

    function awesometown(previous, baton) {
        baton.take();

        window.setTimeout(function() {
            
            //do stuff
            
            baton.pass(420);    //This value will be passed to the next task
        }, 100);

        return 50; // this will NOT be passed to the next function since you took the baton.
    }


the start method provides a callback to execute when the workflow is finished.  The final
return value is also passed to the callback:

   order.start({
       callback: function(review) {
               console.log("dude!, your car is behind that mail truck!");
               expect(review).toBe("two thumbs up");
       }
   });

you can also pass context to use for the callback:

   order.start({
       callback: function() {
           //do stuff
       }, 
       context: transfunctioner
   });
    
# Waiting between tasks

If you ever need to take a break and reflect on the moment you can add some time(in ms) to chill between tasks:

    jWorkflow.order(seeDoubleRainbow)
             .chill(1000)
             .andThen(omg)
             .andThen(omg)
             .andThen(omg)
             .chill(1000)
             .andThen(freakOut);

# Handling Parallel tasks

If you need to handle some tasks and don't care about when they are done you can pass in an array of functions and / or other workflows to execute
at the same time.

    jWorkflow.order([man, man, halfMan])
             .andThen([jWorkflow.order([guy, guy]).andThen(girl), pizzaPlace]);

# Canceling Workflows

To cancel the execution of the workflow you can call the drop method on the baton:

    function (previous, baton) {
        //the value passed to drop will be passed onto the final callback if it exists
        baton.drop("I dropped the soap");
        //this value will NOT be passed to the next workflow step
        return 10;
    }

NOTE: This will force the workflow into async mode.

# Contributers:

    Gord Tanner <gtanner@gmail.com>
