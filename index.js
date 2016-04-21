var config = require('./config');
var express = require('express');
var http = require('http');
var _ = require('lodash');
var app = express();
var mongojs = require('mongojs')
var db = mongojs('ntuaf', ['jokes', 'talks', 'talks_admin'])
var Promise = require('bluebird');

global.Talks = db.talks;
Promise.promisifyAll(Talks);
global.Users = db.talks_admin;
Promise.promisifyAll(Users);

var bodyParser = require('body-parser');

var ua = require('universal-analytics');
var ga = ua('UA-68973533-7');

var Redis = require('ioredis');

var defaultMessage = require('./default');

global.redisClient = new Redis({
  host: 'localhost',
  port: '6379'
});

var session = require('express-session');
var RedisStore = require('connect-redis')(session);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  store: new RedisStore({
    client: redisClient
  }),
  resave: false,
  saveUninitialized: false,
  secret: config.secret,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

app.set('view engine', 'ejs');
app.set('port', config.port || 3000);
app.get('/m', function(req, res) {
  var firstManUrl = _.head(config.targetsMan);
  return res.redirect(firstManUrl);
});
app.get('/w', function(req, res) {
  var firstWomanUrl = _.head(config.targetsWoman);
  return res.redirect(firstWomanUrl);
});
app.get('/login', function(req, res) {
  return res.render('login')
});
app.post('/login', function(req, res) {
  var name = req.body.username
  var password = req.body.password
  Users.find({
    username: name,
    password: password
  }, function(err, result) {
    if (err || !result) {
      return res.redirect('http://artfest.ntu.edu.tw/');
    }
    req.session.current_user = result[0];
    req.session.save();
    return res.redirect('/rmpcl6')
  })
});
app.post('/message', function(req, res) {
  var event = req.body.event;
  defaultMessage(event, function(result) {
    return res.json(result);
  })
})
app.use(function(req, res, next) {
  if (!req.session.current_user || req.session.current_user.user_type !== 'admin') {
    return res.redirect('http://artfest.ntu.edu.tw/');
  }
  if (req.session.current_user && req.session.current_user.user_type === 'admin') {
    return next();
  }
})
app.get('/rmpcl6/batch', function(req, res) {
  Talks.aggregate([{
    $group: {
      _id: {
        'type': '$type'
      },
      count: {
        $sum: 1
      }
    }
  }], function(err, count) {
    Talks.aggregate([{
      $match: {
        'type': 'text'
      }
    }, {
      $group: {
        _id: {
          'message': '$message'
        },
        count: {
          $sum: 1
        }
      }
    }], function(err, result) {
      result = _.map(result, function(row) {
        return {
          message: row._id.message,
          count: row.count
        }
      })
      result = _.reverse(_.sortBy(result, 'count'));
      return res.render('talks_batch', {
        count: count,
        talks: result
      })
    })
  })
});
app.get('/rmpcl6', function(req, res) {
  Talks.aggregate([{
    $group: {
      _id: {
        'type': '$type'
      },
      count: {
        $sum: 1
      }
    }
  }], function(err, count) {
    Talks.aggregate([{
      $match: {
        'type': 'text'
      }
    }, {
      $group: {
        _id: {
          'message': '$message'
        },
        count: {
          $sum: 1
        }
      }
    }], function(err, result) {
      result = _.map(result, function(row) {
        return {
          message: row._id.message,
          count: row.count
        }
      })
      result = _.reverse(_.sortBy(result, 'count'));
      return res.render('talks', {
        count: count,
        talks: result
      })
    })
  })
});
app.post('/rmpcl6/delete', function(req, res) {
  var query = req.body.message
  Talks.remove({
    type: 'text',
    message: query
  }, function(err, result, k) {
    return res.redirect('/rmpcl6')
  })
});
app.post('/rmpcl6/deletes', function(req, res) {
  var messages = req.body.messages
  return Promise.all(_.map(messages, function(message) {
      return Talks.removeAsync({
        type: 'text',
        message: message
      })
    }))
    .then(function() {
      return res.redirect('/rmpcl6')
    })
});
var server = http
  .createServer(app)
  .listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
  });