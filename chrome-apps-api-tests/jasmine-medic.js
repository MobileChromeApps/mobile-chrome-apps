jasmineRequire.medic = function(j$) {
  j$.MedicReporter = jasmineRequire.MedicReporter(j$);
};

jasmineRequire.MedicReporter = function(j$) {
  
  var noopTimer = {
  start: function() {},
  elapsed: function() { return 0; }
  };
  
  function MedicReporter(options) {
    var env = options.env || {},
    logoptions = options.log || {logurl: 'http://localhost:6800'},
    getContainer = options.getContainer,
    createElement = options.createElement,
    createTextNode = options.createTextNode,
    onRaiseExceptionsClick = options.onRaiseExceptionsClick || function() {},
    timer = options.timer || noopTimer,
    results = [],
    specsExecuted = 0,
    failureCount = 0,
    pendingSpecCount = 0,
    symbols;


    var serverurl = logoptions.logurl;

    this.initialize = function() {
    }
    
    var totalSpecsDefined;
    this.jasmineStarted = function(options) {
      totalSpecsDefined = options.totalSpecsDefined || 0;
      timer.start();
    };
    
    var topResults = new j$.ResultsNode({}, "", null),
    currentParent = topResults;
    
    this.suiteStarted = function(result) {
    };
    
    this.suiteDone = function(result) {

    };
    
    this.specStarted = function(result) {
      // Start timing this spec
    };
    
    var failures = [];
    this.specDone = function(result) {
      if (result.status != "disabled") {
        specsExecuted++;
      }
      if (result.status == "failed") {
        failureCount++;
        results.push(result);
      }
      if (result.status == "pending") {
        pendingSpecCount++;
      }
    };

    buildResults = function(){
      var json ={specs:specsExecuted, failures:failureCount, results: results};
      return json;
    }
    
    this.jasmineDone = function() {
      var p = 'Desktop';
      var devmodel='none';
      if(typeof device != 'undefined') {
        p = device.platform.toLowerCase();
        devmodel=device.model || device.name;
      }

      this.postTests({
          mobilespec:buildResults(),
          platform:(platformMap.hasOwnProperty(p) ? platformMap[p] : p),
          version:p,
          timestamp:Math.round(Math.floor((new Date()).getTime() / 1000)),
          model:devmodel
          });
      
    };
    

    logresult = function(){
      if(failureCount>0 ) {
        console.log('[[[ TEST OK ]]]');
      } else {
        console.log('[[[ TEST FAILED ]]]');
      }
      logfinished();
    };
    
    var logfinished = function(){
      console.log('>>> DONE <<<');
    };
    
    this.postTests = function(json) {
      console.log('posting tests');

      var xhr = new XMLHttpRequest();
      xhr.open("POST", serverurl+'/result', true);
      xhr.setRequestHeader("Content-Type","application/json")
      xhr.send(JSON.stringify(json));
    }
    return this;
  }
  
   /**
   * Calculate elapsed time, in Seconds.
   * @param startMs Start time in Milliseconds
   * @param finishMs Finish time in Milliseconds
   * @return Elapsed time in Seconds */
  function elapsedSec(startMs, finishMs) {
    return (finishMs - startMs) / 1000;
  }

  var platformMap = {
    'ipod touch':'ios',
    'iphone':'ios'
  };

  return MedicReporter;
};
