var express = require('express');
var fs = require('fs');
var kdt = require('kdt');
var coords = [];
var tree;

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


var main = function() {
    var app = express.createServer(express.logger());
    app.get('/', function(req, res) {

        //    {"errors":[{"message":"Bad Authentication data","code":215}]}

        if(!req.query.lat || !req.query.long) {
            res.status(400);
            res.send('Parametros insuficientes');
        }
        else {

            var nearest = tree.nearest({lat: req.query.lat, long: req.query.long},1);
            res.send(JSON.stringify(nearest[0][0]));
        }

    });

    var port = process.env.PORT || 8080;

    app.listen(port, function() {
        console.log("Listening on " + port);
    });
}
