
var AWS = require('aws-sdk');
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
var request = require('request');
var transcribeservice = new AWS.TranscribeService();

function startTranscribe(params){
  return  new Promise(function(resolve, reject) {
    transcribeservice.startTranscriptionJob(params, function(err, data) {
      if (err) console.log(err, err.stack); 
      else{
        resolve(data);
      }   
    });
  })
}

function getTranscribe(jobname){
  var params = {
    TranscriptionJobName: jobname
  };
  return  new Promise(function(resolve, reject) {
    transcribeservice.getTranscriptionJob(params, function(err, data) {
      if (err) console.log(err, err.stack); 
      else {
        resolve(data);
      }
    });
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getS3Object(params){
  return  new Promise(function(resolve, reject) {
    s3.getObject(params, function(err, data) {
      if (err) console.log(err, err.stack); 
      else{
        var response = data.Body.toString();
        response = JSON.parse(response);
        resolve(response);
        //console.log(data);
      }         
    });
  })
}

function sendRequest(url, params){
  console.log(url);
  console.log(params);
  return  new Promise(function(resolve, reject){
    request.post({
    "headers": {'content-type': 'application/json'},
    "url": url,
    "form": params
    }, function(err, res, body) {
    if (err){
      console.log("\n\nerror\n\n");
    } else {
      console.log(body)
      resolve(body)
    }
    })
  })
  
}

exports.handler = async function(event, context, callback) {

  // Get S3 bucket and audio name
  var bucket = event.Records[0].s3.bucket.name;
  var name = event.Records[0].s3.object.key;
  // Use Transcribe API to transcribe audio to text
  var s3url = "https://s3.amazonaws.com/" + bucket + "/" + name;
  var date = new Date();
  var timestamp = date.getTime();
  var jobname = bucket + "-" + name + "-" + timestamp;
  var params = {
    LanguageCode: "en-US",
    Media: { 
      MediaFileUri: s3url
    },
    MediaFormat: "mp3",
    TranscriptionJobName: jobname,
    OutputBucketName: bucket,
  };
  var start = await startTranscribe(params);
  console.log(start);
  var jobstatus = start.TranscriptionJob.TranscriptionJobStatus;
  var finish = false;
  var outputfile;
  if(jobstatus.toString() === "IN_PROGRESS"){
    console.log("not complete after start" + start.TranscriptionJob.TranscriptionJobStatus.toString());
  } else {
    console.log("complete after start");
    finish = true;
    outputfile = start.TranscriptionJob.Transcript.TranscriptFileUri;
    console.log(outputfile);
  }
  while(!finish){
    //var timeout = await sleep(30000);
    await sleep(70000);
    var status = await getTranscribe(jobname);
    console.log(status);
    var job = status.TranscriptionJob.TranscriptionJobStatus;
    console.log(job);
    if(job.toString() === "COMPLETED"){
      console.log("complete after get " + job.toString());
      finish = true;
      outputfile = status.TranscriptionJob.Transcript.TranscriptFileUri;
      console.log(outputfile);
    } else{
      console.log("not complete after get " + job.toString());
    }
  }
  // Get S3 bucket and file name
  var bucket = event.Records[0].s3.bucket.name;
  var name = event.Records[0].s3.object.key;
  var params = {
    Bucket: bucket,
    Key: name
  };
  var json_data = await getS3Object(params);
  console.log(json_data);
  var temp = json_data.results.transcripts[0].transcript;
  let buff = new Buffer(temp);  
  let word = buff.toString('base64');
  //var word = temp;
  var id = name.split(".")[0].split("-")[1];
  console.log(id);
  //console.log(word)
  
  // send request to api gateway
  var url = "https://0tmbn5z7y4.execute-api.us-east-1.amazonaws.com/speechtotext/sendtext";
  var words = [];
  var element = {
    "word" : word,
    "timestamp" : 0.1
  };
  words.push(element);
  var param = {
    "words" : words,
    "roomcode" : id
  };
  console.log(param);
  var data = '{ "request" : "msg","data": '+ JSON.stringify(param) + '}';
  console.log(data);
  var x = await sendRequest(url, data);
  console.log(x);
  
};
