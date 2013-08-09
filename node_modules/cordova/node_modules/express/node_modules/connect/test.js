var connect = require('./');

var app = connect();

app.use(function(req, res, next){
  req.on('data', function(chunk){
    console.dir(chunk.toString());
  }).on('end', function(){
    console.log('end');
    res.end('thanks');
  });
});

app.listen(3000);