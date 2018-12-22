var count = 0;
var paused = true;
var wordArray;
var fileArray;
var href;
var roomCode = null;
var bucketRegion = 'us-east-1';
var file;
var IdentityPoolId = 'us-east-1:ced528e8-9c58-40dd-b78b-cc8e0ed80d61';
AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
    })
});


var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {Bucket: 'supernotes'}
});

function setRoomCode() {
    if (roomCode == null) {
        roomCode = prompt('Enter Room Code:','');
    }
    // console.log(roomCode);
    s3.listObjects({Delimiter: '/'}, function(err,data) {
        if (err){
            return alert('There was an error viewing your folders');
        } else {
            console.log(data.CommonPrefixes)
            if(!data.CommonPrefixes.includes(roomCode)) {
                roomCode = roomCode.trim();
                if (!roomCode) {
                    return alert('class names must contain at least one non-space character.');
                }
                if (roomCode.indexOf('/') !== -1) {
                    return alert('class names cannot contain slashes.');
                }
                var classKey = encodeURIComponent(roomCode) + '/';
                s3.headObject({Key: classKey}, function(err, data) {
                    if(!err){
                        console.log("about to load files")
                        loadFiles(roomCode);
                        return alert('Successfully opened class')
                    }
                    if (err && err.code !== 'NotFound') {
                        return alert('There was an error creating your class: ' + err.message);
                    }
                    s3.putObject({Key: classKey}, function(err, data) {
                        if (err) {
                            return alert('There was an error creating your class: ' + err.message);
                        }
                        alert('Successfully created class.');
                        console.log("about to load files")
                        loadFiles(roomCode);
                    });
                });

            }

        }
    })
}
var streamData;
function togglePause() {
    if(paused == true){
        paused = false;
        pause.innerHTML = "<i class='far fa-pause-circle fa-lg'></i> Pause"
        streamData = setInterval(function(){
            if(!paused){
                var apigClient = apigClientFactory.newClient();

                var body = {
                    "wordnum": count,
                    "roomcode": roomCode
                };

                apigClient.gettextPost([],body,[])
                .then(function(result){
                    console.log(result);
                    console.log(body);
                    wordArray = result.data.body.words;
                    // if (wordArray.length == 0)
                    // {
                    //     togglePause();
                    // }
                    for(var i = 0; i< wordArray.length; i++){
                        count++;
                        textField.document.body.append(wordArray[i]+' ');
                    }
                }).catch(function(result){
                    outputArea.append('error: ' + JSON.stringify(result));
                })
            }
        }, 3000);
    } else {
        paused = true;
        pause.innerHTML = "<i class='far fa-play-circle fa-lg'></i> Stream"
    }
}
function uploadToS3(arg) {
    if(!paused){
        togglePause();
    }
    s3.upload({
        Key: roomCode +'/'+arg,
        Body: '<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="utf-8"></head><body>'+textField.document.body.innerHTML+'</body></html>',
        ACL: 'public-read'
    }, function(err, data) {
        if (err) {
            console.log(err.message)
            return alert('There was an error uploading your file: ', err.message);

        }
        alert('Successfully uploaded '+arg+'.');

        var select = document.getElementById("file");
        removeOptions(select)
        setRoomCode()
        //loadFiles(roomCode);
    });
}
function loadFiles(folderName) {
    console.log("in loadFiles()")
    var params = {
        Bucket: "supernotes",
        Prefix: folderName+'/'
    };
    console.log('supernotes/' + folderName)
    s3.listObjects(params, function(err, data) {
        console.log(data);
        href = this.request.httpRequest.endpoint.href;
        if (err) console.log(err, err.stack); // an error occurred
        else {
            var select = document.getElementById("file");
            select.options[select.options.length] = new Option("Select file from "+folderName+ " class", 'Select');
            for (var i=1; i<data.Contents.length; i++)
            select.options[select.options.length] = new Option(data.Contents[i].Key, data.Contents[i].Key);
        }          // successful response
    });

}

function removeOptions(selectbox)
{
    var i;
    for(i = selectbox.options.length - 1 ; i >= 0 ; i--)
    {
        selectbox.remove(i);
    }
}

async function editFile(arg) {
    // clearInterval(streamData);
    // if(!paused){
    //     togglePause();
    // }
    if (arg == 'Select'){
        textField.document.body.innerHTML = '';
    } else {
        var bucketUrl = href + 'supernotes/';
        var request = makeHttpObject();
        request.open("GET", bucketUrl+arg, true);
        request.send(null);
        request.onreadystatechange = function() {
            if (request.readyState == 4){
                if(document.getElementById("file").options.value!="default")
                textField.document.body.innerHTML = request.responseText;
            }else{
                textField.document.body.innerHTML ="";
            }
        };
    }




}
function makeHttpObject() {
    try {return new XMLHttpRequest();}
    catch (error) {}
    try {return new ActiveXObject("Msxml2.XMLHTTP");}
    catch (error) {}
    try {return new ActiveXObject("Microsoft.XMLHTTP");}
    catch (error) {}

    throw new Error("Could not create HTTP request object.");
}
