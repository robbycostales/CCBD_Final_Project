var AWS = require('aws-sdk');
var db = new AWS.DynamoDB({apiVersion: '2012-10-08'});

function Query(params){
  var words = [];
  return  new Promise(function(resolve, reject) {
    db.query(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        data.Items.forEach(function(element, index, array) {
          console.log(element);
          words.push(element.Word.S);
        });
        resolve(words);
      }
    });
  })
}


exports.handler = async function(event, context, callback) {
    
    var wordnum = event.wordnum;
    var UserId = event.roomcode;
    
    // query item in db
    var params = {
      ExpressionAttributeValues: {
        ':user': {S: UserId},
        ':e': {N: wordnum.toString()}
      },
      KeyConditionExpression: 'UserId = :user and WordNumber > :e',
      ProjectionExpression: 'Word',
      TableName: 'Word'
    };
    var words = await Query(params);
    
    var response = {
      statusCode: 200,
      body: {
        "words" : words
      },
    };
    return response;
};
