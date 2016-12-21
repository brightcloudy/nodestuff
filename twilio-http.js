var http = require('http');
var ytsearch = require('youtube-search');
var twilio = require('twilio');
var Regex = require('regex');
var url = require('url');
var youtubedl = require('youtube-dl');
var fs = require('fs');
var spawn = require('child_process').spawn;
var config = require('./config');

var client = new twilio.RestClient(config.accountSid, config.authToken);
var twinumber = config.number;

function handleRequest(request, response) {
  var date = new Date();
  var textTime = date.getTime();
  var url_parts = url.parse(request.url, true);
  var params = url_parts.query;
  console.log('-------------- ' + url_parts.pathname + ' ---------------');
  if (url_parts.pathname == '/pebble') {
    console.log('Pebble text2web received with text: \"' + params.text + '\"');
  }
  if (url_parts.pathname.substring(0, 10) == '/callback-') {
    console.log('Callback received for ' + url_parts.pathname.substring(10));
    if (params.CallStatus == 'in-progress') {
      console.log('Call answered.');
    }
    if (params.CallStatus == 'completed') {
      console.log('Call completed.');
      fs.unlinkSync('./wavs/' + url_parts.pathname.substring(10) + '.wav');
      fs.unlinkSync('./call-' + url_parts.pathname.substring(10) + '.xml');
      fs.unlinkSync('./video-' + url_parts.pathname.substring(10) + '.mp4');
    }
    response.end();
  } else if (url_parts.pathname.substring(url_parts.pathname.length-4) == '.xml') {
    fs.readFile('.'.concat(url_parts.pathname), function(error, content) {
      response.writeHead(200, { 'Content-Type': 'text/xml' });
      response.end(content, 'utf-8');
    });  
  } else if (url_parts.pathname.substring(url_parts.pathname.length-4) == '.wav') {
    console.log('Sending wav');
    fs.readFile('.'.concat(request.url), function(error, content) {
      if (error) console.log(error);
      response.writeHead(200, { 'Content-Type': 'audio/wav' });
      response.end(content, 'utf-8');
    });
    console.log('wav completed send.');
  } else if (url_parts.pathname.substring(1) == 'twisms') {
    console.log("SMS Received From: ".concat(params.From));
    ytsearch(params.Body, config.opts, function(err, results) {
      if (err) return console.log(err);
      console.dir(results[0]);
      sendText(params.From, params.To, "Please wait for a call back from this number to listen to the video/song you requested. Link: http://youtu.be/" + results[0].id);
      var video = youtubedl(results[0].link, [], { cwd: __dirname });
			video.on('info', function(info) {
				console.log('Download started');
				console.log('filename: video-' + textTime + '.mp4');
				console.log('size: ' + info.size);
			});
      video.pipe(fs.createWriteStream('video-' + textTime + '.mp4'));
      video.on('end', function() {
        console.log('Download finished');
        if (fs.exists('./out.wav')) {
          fs.unlinkSync('./out.wav');
        }
        var ffmpeg = spawn('ffmpeg', ['-y', '-i', 'video-' + textTime + '.mp4', '-vn', '-acodec', 'pcm_mulaw', '-ar', '8000', 'out.wav']);
        console.log('starting ffmpeg');
				ffmpeg.stderr.on('data', function(data) {
					console.log('stderr: ' + data);
				});
        ffmpeg.on('close', (code) => {
          console.log('ffmpeg terminated');
          if (fs.exists('video-' + textTime + '.mp4')) {
            fs.unlinkSync('video-' + textTime + '.mp4');
          }
          fs.renameSync('./out.wav', './wavs/'.concat(textTime).concat('.wav'));
          fs.writeFileSync('./call-' + textTime + '.xml', '<Response>\n<Play>http://gcloud.gayest.horse/wavs/'.concat(textTime).concat('.wav</Play>\n</Response>'));
          client.calls.create({
            url: "http://gcloud.gayest.horse/call-" + textTime + ".xml",
            to: params.From,
            from: params.To,
            statusCallback: "http://gcloud.gayest.horse/callback-" + textTime,
            statusCallbackMethod: "GET",
            statusCallbackEvent: ["answered", "completed"]
          }, function(err, call) {
            console.log(call.sid);
          });
        });
      });
    });
  } else {
    response.end();
  }
}
function sendText(tonum, fromnum, mesg) {
  client.messages.create({
      body: mesg,
      to: tonum,
      from: fromnum,
  }, function(err, message) {
      if (err) {
    console.log(err);
      } else {
    console.log(message.sid);
      }
  });
}
//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(80, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening");
});
