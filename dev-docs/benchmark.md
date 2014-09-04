Recently I needed to benchmark the `exec` bridge in `cca` apps using the crosswalk webview.  We should probably add this to our test suite eventually, but for now I just wanted to document the steps I took.

First, create the chrome spec application, and add the cordova echo plugin:

```
> cca create CrSpec --link-to=../mobile-chrome-apps/chrome-cordova/chrome-apps-api-tests
> cd CrSpec
> cca plugin add ../cordova/cordova-mobile-spec/cordova-plugin-echo
> cca run android --device
```

Next, open dev tools and paste this code:

```
function task(message) {
  return Q.Promise(function(resolve, reject) {
    setTimeout(function() {
      cordova.echo(resolve, reject, message);
    }, 0);
  })
}

function bench(f, times) {
  var start = new Date();
  var p = [];
  for (var i = 0; i < times; i++) {
    p.push(f());
  }
  return Q.all(p).then(function() {
    return new Date() - start;
  });
}
```

Then bench string transfer with:

```
var repeat = 1000;
var message = 'abcdefghijklmnopqrstuvwxyz';
bench(task.bind(task, message), repeat).then(function(ms) { console.log(ms / repeat, 'ms/call'); })
```

And bench ArrayBuffer transfer with:

```
var repeat = 1000;
var size = 16000;
var message = new ArrayBuffer(size);
var payloadView = new Uint8Array(message);
for (var i = 0; i < payloadView.length; i++) {
    payloadView[i] = i;
}
bench(task.bind(task, message), repeat).then(function(ms) { console.log(ms / repeat, 'ms/call', size * repeat / ms, 'kB/s'); })
```
