var config = require('./config');
var express = require('express');
var http = require('http');
var _ = require('lodash');
var app = express();

app.set('port', config.port || 3000);

app.get('/m', function(req, res) {

  var firstManUrl = _.head(config.targetsMan);

  return res.redirect(firstManUrl);
});
app.get('/w', function(req, res) {

  var firstWomanUrl = _.head(config.targetsWoman);

  return res.redirect(firstWomanUrl);
});
app.use(function(req, res) {
  return res.redirect('http://artfest.ntu.edu.tw/');
})

var server = http
  .createServer(app)
  .listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
  });