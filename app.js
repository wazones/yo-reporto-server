var express = require('express');
var fs = require('fs');
var kdt = require('kdt');
var coords = [];
var tree;

var util = require('util'),
    twitter = require('twitter');
var secrets = JSON.parse(process.env.SECRETS);
var twit = new twitter({
    consumer_key: secrets.consumerKey,
    consumer_secret: secrets.consumerSecret,
    access_token_key: secrets.accessToken,
    access_token_secret: secrets.accessTokenSecret
});

fs.readFile('data/db.csv', 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }
    else {
        var lines = data.toString().split('\n');
        lines.forEach(function(line){
            var t = line.split('\t');
            if(t.length == 4) {
                var coord = {};
                coord.municipio = t[0];
                coord.lat = parseFloat(t[1]);
                coord.long = parseFloat(t[2]);
                coord.depto = t[3];
                coords.push(coord);
            }
        });
        console.log('Size: '+coords.length);
        buildTree();
        main();

    }
});


var distance = function(a,b) {
    return Math.pow(a.lat - b.lat, 2) +  Math.pow(a.long - b.long, 2);
}
var buildTree= function(){
    tree = kdt.createKdTree(coords, distance, ['lat', 'long'])

    var nearest = tree.nearest({ lat: 40, long: 75 }, 1);

    console.log(nearest.reverse());

}

var getCoordenates = function(req, res) {

    if(!req.query.lat || !req.query.long) {
        res.send(400,{'errors':['Parametros insuficientes']});
    }
    else {
        try {
            var count = 1;
            if(req.query.count) {
                count = req.query.count;
            }
            var nearest = tree.nearest({lat: req.query.lat, long: req.query.long},count)
            .map(function(elem) {
                return elem[0];
            });
            res.send(200,{'nearest':nearest});
        }catch(err) {
            res.send(400,{'errors':['Something went wrong']});       
        }
    }

}
var getTweets = function(req, res) {
    var count = 10;
    if(req.query.count) {
        count = req.query.count;
    }
    twit.get('/statuses/user_timeline.json', 
    {screen_name:'UNGRD',count:count,trim_user:'true',exclude_replies:'true'},
    function(data) {
        var response = {tweets:
            data.map(function(elem){
                return elem.text;
            })
        }
        res.send(200,response);
    });
}
var main = function() {
    var app = express();
    app.get('/coordenates', getCoordenates);
    app.get('/tweets', getTweets);


    var port = process.env.PORT || 8080;

    app.listen(port, function() {
        console.log("Listening on " + port);
    });
}
