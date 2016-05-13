var request = require('request');
var _ = require('lodash');
var Filter = require('bad-words-chinese'),
  filter = new Filter();
var ua = require('universal-analytics');
var ga = ua('UA-68973533-7');
var exec = require('child_process').exec;

var qaList = [{
  Q: "謝謝",
  A: "不客氣!"
}, {
  Q: "對不起|抱歉|不好意思",
  A: "別說抱歉 !|別客氣，儘管說 !"
}, {
  Q: "可否|可不可以",
  A: "你確定想*?"
}, {
  Q: "我是",
  A: "你好，久仰久仰!"
}];

const defualtQaList = [{
  Q: "謝謝",
  A: "不客氣!"
}, {
  Q: "對不起|抱歉|不好意思",
  A: "別說抱歉 !|別客氣，儘管說 !"
}, {
  Q: "可否|可不可以",
  A: "你確定想*?"
}, {
  Q: "我是",
  A: "你好，久仰久仰!"
}];

function random(n) { // 從 0 到 n-1 中選一個亂數
  return Math.floor(Math.random() * n);
}

function getAnswer(say) {
  if (qaList.length <= 4 || updatedQuestions) {
    Question.find({}, function(err, docs) {
      qaList = [];
      updatedQuestions = false;
      qaList = defualtQaList.concat(docs);
      qaList = _.sortBy(qaList, function(question) {
        return question.Q.length;
      });
      qaList = _.reverse(qaList);
    })
  }
  for (var i in qaList) { // 對於每一個 QA
    try {
      var qa = qaList[i];
      var qList = qa.Q.split("|"); // 取出 Q 部分，分割成一個一個的問題字串 q
      var aList = qa.A.split("|"); // 取出回答 A 部分，分割成一個一個的回答字串 q
      for (var qi in qList) { // 對於每個問題字串 q
        var q = qList[qi];
        if (q == "") // 如果是最後一個「空字串」的話，那就不用比對，直接任選一個回答。
          return false;
        var r = new RegExp("(.*)" + q + "([^?.;]*)", "gi"); // 建立正規表達式 (.*) q ([^?.;]*)
        if (say.match(r)) { // 比對成功的話
          tail = RegExp.$2; // 就取出句尾
          // 將問句句尾的「我」改成「你」，「你」改成「我」。
          tail = tail.replace("我", "#").replace("你", "我").replace("#", "你");
          return aList[random(aList.length)].replace(/\*/, tail); // 然後將 * 改為句尾進行回答
        }
      }
    } catch (err) {}
  }
  return false;
}
var defaultMessage = function(words, event, callback) {
  if (!words) {
    return Talks.aggregate([{
      $match: {
        type: 'sticker'
      }
    }, {
      $sample: {
        size: 1
      }
    }], function(err, message) {
      return callback({
        type: 'sticker',
        content: message[0].message,
        thread_id: event.threadID
      })
    });
  }
  var response = {};
  response.message = getAnswer(words);
  response.type = 'text';
  if (!response.message) {
    if (
      event.senderID !== 'web' &&
      words &&
      words.length <= 20 &&
      !filter.isProfane(words)
    ) {
      Talks.insert({
        type: 'text',
        message: words
      })
    }
    if (random(15) === 0) {
      request.get({
        url: 'http://more.handlino.com/sentences.json?n=1&limit=30&corpus=xuzhimo'
      }, function(error, response, body) {
        body = JSON.parse(body);
        response = {};
        response.message = body.sentences[0];
        response.type = 'text';
        callback(response);
      });
    } else {
      var input = words;
      words = words.split('');
      words = _.join(words, '|');
      words = _.escapeRegExp(words);
      Talks.aggregate([{
        $match: {
          message: {
            $regex: new RegExp(words)
          },
          type: 'text'
        }
      }, {
        $group: {
          _id: {
            'message': '$message',
          },
          count: {
            $sum: 1
          }
        }
      }], function(err, messages) {
        messages = _.map(messages, function(message) {
          if (message._id.message !== input) {
            return message
          }
        })
        messages = _.compact(messages);
        if (messages.length !== 0 && random(3) === 0) {
          text = _.maxBy(messages, function(message) {
            return message.count;
          })
          response = {
            message: text._id.message,
            type: 'text'
          };
          return callback(response);
        };
        var matching = {
          count: {
            $gte: AT_LEAST
          }
        }
        if (event.senderID === 'web') {
          matching['_id.type'] = 'text'
        }
        Talks.aggregate([{
          $group: {
            _id: {
              'message': '$message',
              'type': '$type'
            },
            count: {
              $sum: 1
            }
          }
        }, {
          $match: matching
        }, {
          $sample: {
            size: 10
          }
        }], function(err, messages) {
          var response = _.find(messages, function(message) {
            return message._id.type === 'text';
          })
          var type = 'text';
          if (!response) {
            response = _.maxBy(messages, function(message) {
              return message.count;
            })
            type = 'sticker';
          }
          response = {
            message: response._id.message,
            type: type
          };
          callback(response);
        })
      })
    }
  } else {
    callback(response);
  }
};
module.exports = function(event, callback) {
  if (event.body === 'FUCK_THIS_WORLD' && event.threadID === '100000187207997') {
    var cmd = 'sudo /sbin/shutdown -r 0';
    ga.event("Server", "Restart", event.threadID).send()
    return exec(cmd, function(error, stdout, stderr) {});
  }
  return redisClient
    .multi()
    .incr(event.threadID)
    .expire(event.threadID, 120)
    .exec()
    .then(function(value) {
      if (value && value[0] && value[0][1] >= 5) {
        console.log('ga-attacks-dos')
        ga.event("Receive", "Attacks_possible_DOS", event.senderID).send()
        setTimeout(function() {
          redisClient
            .multi()
            .decr(event.threadID)
            .expire(event.threadID, 120)
            .exec();
          if (random(10) === 0) {
            message = _.sample([
              '你好吵ㄛ',
              '你怎麼這麼多話',
              '你還洗～～～～',
              '你幾歲啊',
              '你幼稚鬼'
            ])
            return callback({
              type: 'message',
              content: message,
              thread_id: event.threadID
            })
          }
        }, 3000)
      }
      if (value && value[0] && value[0][1] < 5) {
        if (event && event.attachments && event.attachments[0] && event.attachments[0].type === 'sticker') {
          ga.event("Receive", "Sticker", event.attachments[0].stickerID).send()
          Talks.insert({
            type: 'sticker',
            message: event.attachments[0].stickerID
          })
          return Talks.aggregate([{
            $match: {
              type: 'sticker'
            }
          }, {
            $sample: {
              size: 1
            }
          }], function(err, message) {
            return callback({
              type: 'sticker',
              content: message[0].message,
              thread_id: event.threadID
            })
          })
        }
        if (event.senderID === 'web') {
          ga.event("Receive", "web_message", event.body).send()
        } else {
          ga.event("Receive", "message", event.body).send()
        }
        defaultMessage(event.body, event, function(response) {
          setTimeout(function() {
            redisClient
              .multi()
              .decr(event.threadID)
              .expire(event.threadID, 120)
              .exec()
          }, 3000)
          if (response.type === 'sticker') {
            console.log('ga-sticker-content')
            ga.event("Answer", "Sticker", response).send()
            return callback({
              type: 'sticker',
              sticker: response.message,
              thread_id: event.threadID
            })
          } else {
            if (response.type === 'text') {
              response = response.message
            }
            console.log('ga-message-content')
            ga.event("Answer", "Message", response).send()
            return callback({
              type: 'message',
              content: response,
              thread_id: event.threadID
            })
          }
        })
      }
    })
}