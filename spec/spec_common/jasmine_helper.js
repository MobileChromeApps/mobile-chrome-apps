
function chromeSpec(func) {
  chromeSpecs[!!window.runningInBg].push(func);
}
