
var express = require('./')
var app = express();

app.get('/', function(req, res){
  res.send('hello world');
});

app.listen(4000)