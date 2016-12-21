var http = require('http');
var https = require('https');
var querystring = require('querystring');
var fs = require('fs');
var request = require('request');
var config = require('config');

var query_data = querystring.stringify({
  'size': '600x300',
  'zoom': '20',
  'center': '2000 SE Port St Lucie Blvd, Port St Lucie, FL 34984',
  'maptype': 'satellite',
  'key': config.key,
  'format': 'png'
});
console.log(query_data);

var query_url = 'https://maps.googleapis.com/maps/api/staticmap?' + query_data;
console.log(query_url);

var download = function(uri, filename, callback) {
  request.head(uri, function(err, res, body) {
    console.log(res.headers['content-type']);
    console.log(res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

download(query_url, './statmap.png', function() {
  console.log('done');
});
//var imgout = fs.openSync('./svimage.png', 'w');
//var query_req = https.get(query_options, function(res) {
//  var statusCode = res.statusCode;
//  var contentType = res.headers['content-type'];
//  console.log(contentType);
//  res.setEncoding('utf8');
//  res.on('data', function(c) {
//    fs.write(imgout, c);
//  });
//  res.on('end', function() {
//    fs.closeSync(imgout);
//  });
//});
