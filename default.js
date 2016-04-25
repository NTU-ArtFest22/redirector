var request = require('request');
var _ = require('lodash');
var Filter = require('bad-words-chinese'),
  filter = new Filter();

var ua = require('universal-analytics');
var ga = ua('UA-68973533-7');

var qaList = [{
  Q: "謝謝",
  A: "不客氣!"
}, {
  Q: "對不起 | 抱歉 | 不好意思",
  A: "別說抱歉 !|別客氣，儘管說 !"
}, {
  Q: "可否 | 可不可以",
  A: "你確定想*?"
}, {
  Q: "我想",
  A: "你為何想*?"
}, {
  Q: "我要",
  A: "你為何要*?"
}, {
  Q: "你是",
  A: "你認為我是*?"
}, {
  Q: "認為 | 以為",
  A: "為何說*?"
}, {
  Q: "感覺",
  A: "常有這種感覺嗎?"
}, {
  Q: "為何不",
  A: "你希望我*!"
}, {
  Q: "是否",
  A: "為何想知道是否*?"
}, {
  Q: "不能",
  A: "為何不能*?|你試過了嗎?|或許你現在能*了呢?"
}, {
  Q: "我是",
  A: "你好，久仰久仰!"
}, {
  Q: "甚麼 | 什麼 | 何時 | 誰 | 哪裡 | 如何 | 為何 | 因何",
  A: "為何這樣問?|為何你對這問題有興趣?|你認為答案是甚麼呢?|你認為如何呢?|你常問這類問題嗎?|這真的是你想知道的嗎?|為何不問問別人?|你曾有過類似的問題嗎?|你問這問題的原因是甚麼呢?"
}, {
  Q: "原因",
  A: "這是真正的原因嗎?|還有其他原因嗎?"
}, {
  Q: "理由",
  A: "這說明了甚麼呢?|還有其他理由嗎?"
}, {
  Q: "你好 | 嗨 | 您好",
  A: "你好，有甚麼問題嗎?"
}, {
  Q: "或許",
  A: "你好像不太確定?"
}, {
  Q: "不曉得 | 不知道",
  A: "為何不知道?|在想想看，有沒有甚麼可能性?"
}, {
  Q: "不想 | 不希望",
  A: "有沒有甚麼辦法呢?|為何不想*呢?|那你希望怎樣呢?"
}, {
  Q: "想 | 希望",
  A: "為何想*呢?|真的想*?|那就去做阿?為何不呢?"
}, {
  Q: "不",
  A: "為何不*?|所以你不*?"
}, {
  Q: "請",
  A: "我該如何*呢?|你想要我*嗎?"
}, {
  Q: "你",
  A: "你真的是在說我嗎?|別說我了，談談你吧!|為何這麼關心我*?|不要再說我了，談談你吧!|你自己*"
}, {
  Q: "總是 | 常常",
  A: "能不能具體說明呢?|何時?"
}, {
  Q: "像",
  A: "有多像?|哪裡像?"
}, {
  Q: "對",
  A: "你確定嗎?|我了解!"
}, {
  Q: "朋友",
  A: "多告訴我一些有關他的事吧!|你認識他多久了呢?"
}, {
  Q: "電腦",
  A: "你說的電腦是指我嗎?"
}, {
  Q: "難過",
  A: "別想它了|別難過|別想那麼多了|事情總是會解決的"
}, {
  Q: "高興",
  A: "不錯ㄚ|太棒了|這樣很好ㄚ"
}, {
  Q: "是阿|是的",
  A: "甚麼事呢?|我可以幫助你嗎?|我希望我能幫得上忙!"
}, {
  Q: "",
  A: "我了解|我能理解|還有問題嗎 ?|請繼續說下去|可以說的更詳細一點嗎?|這樣喔! 我知道!|然後呢? 發生甚麼事?|再來呢? 可以多說一些嗎|接下來呢? |可以多告訴我一些嗎?|多談談有關你的事，好嗎?|想多聊一聊嗎|可否多告訴我一些呢?"
}];

function random(n) { // 從 0 到 n-1 中選一個亂數
  return Math.floor(Math.random() * n);
}

function getAnswer(say) {
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
  var response = {};
  response.message = getAnswer(words);
  response.type = 'text';
  if (words && words.length <= 20 && !filter.isProfane(words)) {
    Talks.insert({
      type: 'text',
      message: words
    })
  }
  if (!response.message) {
    response = '先別說這個了，你聽過藝術季嗎？'
    if (random(10) === 0) {
      request.get({
        url: 'http://more.handlino.com/sentences.json?n=1&limit=30&corpus=xuzhimo'
      }, function(error, response, body) {
        body = JSON.parse(body);
        response = {};
        response.message = body.sentences[0];
        response.type = 'text';
        callback(response);
      });
    } else if (random(5) === 0) {
      callback(response);
    } else {
      words = words.split('');
      words = _.join(words, '|');
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
          if (message._id.message !== words) {
            return message
          }
        })
        messages = _.compact(messages);
        console.log(messages)
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
            $gte: 1
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
  return redisClient
    .multi()
    .incr(event.threadID)
    .expire(event.threadID, 120)
    .exec()
    .then(function(value) {
      if (value && value[0] && value[0][1] >= 5) {
        console.log('ga-attacks-dos')
        ga.event("Receive", "Attacks_possible_DOS", event.senderID).send()
        redisClient
          .multi()
          .decr(event.threadID)
          .expire(event.threadID, 120)
          .exec();
        return callback({
          type: 'dos',
          thread_id: event.threadID
        })
      }
      ga.event("Receive", "message", event.body).send()

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
    })
}