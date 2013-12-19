var express = require('express');
var fs = require('fs');
var kdt = require('kdt');
var coords = [];
var tree;

var util = require('util');
var twitter = require('twitter');
try {
    var secrets = JSON.parse(process.env.SECRETS);
    var twit = new twitter({
        consumer_key: secrets.consumerKey,
        consumer_secret: secrets.consumerSecret,
        access_token_key: secrets.accessToken,
        access_token_secret: secrets.accessTokenSecret
    });
}
catch(err) {
    console.log("SECRETS env variable is not set");
    process.exit(1);
}

fs.readFile('data/db2.csv', 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }
    else {
        var lines = data.toString().split('\n');
        var header = lines[0].split('\t');
        lines = lines.slice(1);
        lines.forEach(function(line){
            var tokens = line.split('\t');
            var coord = {};
            tokens.forEach(function(t,i,tokens){
                coord[ header[i] ] = t;
            });
            coords.push(coord);
        });
        console.log('Size: '+coords.length);
        buildTree();
        main();

    }
});


var distance = function(a,b) {
    return Math.sqrt(Math.pow(a.LATITUD - b.LATITUD, 2) +  Math.pow(a.LONGITUD - b.LONGITUD, 2));
}
var buildTree= function(){
    tree = kdt.createKdTree(coords, distance, ['LATITUD', 'LONGITUD'])
}

var getCoordinates = function(req, res) {

    if(!req.query.lat || !req.query.long) {
        res.send(400,{'errors':['Parametros insuficientes']});
    }
    else {
        try {
            var count = 1;
            if(req.query.count) {
                count = req.query.count;
            }
            var nearest = tree.nearest({LATITUD: parseFloat(req.query.lat), LONGITUD: parseFloat(req.query.long)},count)
            .map(function(elem) {
                var ret = elem[0];
                ret.dist = elem[1];
                return ret;
            });
            /*.sort(function(a,b){
                if (a.dist < b.dist)
                    return -1;
                if (a.dist > b.dist)
                    return 1;
                return 0;
            });
*/
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
    {screen_name:'UNGRD',count:count,exclude_replies:'false'},
    function(data) {
        var response = {tweets:
            data.map(function(elem){
                var t = {
                    text:elem.text,
                    profile_image_url:elem.user.profile_image_url,
                    retweet:false
                }; 
                if(elem.text.substr(0,2) == "RT") {
                    t.text = t.text.substr(t.text.search(":")+2);
                    t.retweet = true;
                    t.profile_image_url=elem.retweeted_status.user.profile_image_url;
                }
                return t;
            })
        }
        res.send(200,response);
    });
}
var getTwitterBanner = function(req,res) {
    /*
    users/profile_banner.json
    */
    twit.get('/users/profile_banner.json', 
    {screen_name:'UNGRD'},
    function(data) {
        res.send(200,data);
    });

}
var getCoordinates2 = function(req,res) {
    var count = 10;
    if(req.query.count) {
        count = req.query.count;
    }

    var coord = {
        LATITUD:req.query.lat,
        LONGITUD:req.query.long,
    };
    var arr = [];
    for(x in coords) {
        arr.push( {
            id:x,
            dist:distance(coords[x],coord)
        });
    }
    
    var ret = arr.sort(function(a,b){
        if (a.dist < b.dist)
            return -1;
        if (a.dist > b.dist)
            return 1;
        return 0;
    })
    .slice(0,count)
    .map(function(x){
        return {
            "ID_DEPARTAMENTO": coords[x.id]["ID_DEPARTAMENTO"],
            "NOMBRE_DEPARTAMENTO": coords[x.id]["NOMBRE_DEPARTAMENTO"],
            "ID_MUNICIPIO": coords[x.id]["ID_MUNICIPIO"],
            "NOMBRE_MUNICIPIO": coords[x.id]["NOMBRE_MUNICIPIO"],
            "LONGITUD": coords[x.id]["LONGITUD"],
            "LATITUD": coords[x.id]["LATITUD"],
            dist: x.dist
        };
    });

    res.send(200,ret);
}
var main = function() {
    var app = express();

    app.all('/*', function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "X-Requested-With");
      next();
    });
    
    app.get('/coordinates', getCoordinates2);
    //app.get('/coordinates2', getCoordinates2);
    app.get('/twitter/tweets', getTweets);
    app.get('/twitter/banner', getTwitterBanner);


    var port = process.env.PORT || 8080;

    app.listen(port, function() {
        console.log("Listening on " + port);
    });
}
