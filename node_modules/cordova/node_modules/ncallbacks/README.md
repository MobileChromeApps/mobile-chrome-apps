# nCallbacks

> function that executes n times

This is a stupid flow control library. Here's how you can use it.

    var end = nCallbacks(3, function (err, whatever) {
        console.log('done now');
    });

    firstAsynchronousThing(end);
    secondAsynchronousThing(end);
    thirdAsynchronousThing(end);

## LICENSE

I don't care
