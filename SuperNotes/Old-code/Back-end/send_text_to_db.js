var AWS = require('aws-sdk');
var db = new AWS.DynamoDB({apiVersion: '2012-10-08'});
var url = require('url');
function Query(UserId){
  var num = 0;
  var params = {
    ExpressionAttributeValues: {
      ':user': {S: UserId}
    },
    KeyConditionExpression: 'UserId = :user',
    ProjectionExpression: 'WordNumber',
    TableName: 'Word'
  };
  return  new Promise(function(resolve, reject) {
    db.query(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        data.Items.forEach(function(element, index, array) {
          console.log(element);
          //console.log("word " + element.Word + " number " + element.Number);
          if(parseInt(element.WordNumber.N, 10) > num){
            num = parseInt(element.WordNumber.N, 10);
          }
        });
        resolve(num);
      }
    });
  })
}

function Put(params){
  return  new Promise(function(resolve, reject) {
    db.putItem(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data);
        resolve(data);
      }
    });
  })
}
exports.handler = async function(event, context, callback) {

    var words = event.data.words;
    var UserId = event.data.roomcode;
    // query latest number of words in db
    var number = await Query(UserId);
    number = parseInt(number, 10);
    console.log(number);
    // put item in db
    console.log(event);
    console.log(words);
    for(var i = 0; i < words.length; i++){
      number += 1;
      console.log("word " + words[i].word);
      console.log(number.toString());
      var temp = words[i].word;
      let buff = new Buffer(temp, 'base64');  
      let word = buff.toString('ascii');
      //var word = temp;
      console.log("buffer " + word);
      var params = {
        TableName: 'Word',
        Item: {
          'UserId' : {S: UserId},
          'WordNumber' : {N: number.toString()},
          'Word' : {S: word}
        }
      };
      var data = await Put(params);
      //console.log("data " + data);
    }
    
    var response = {
      statusCode: 200,
      body: JSON.stringify('OK'),
    };
    return response;
};
