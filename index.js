/* 
Author: Matthías Sigurbjörnsson,  2017
e-Mail: mattisigur@gmail.com

based on some of the code from
https://github.com/vezwork/phasocketonline/blob/master/index.js
*/
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var usercount = 0;
var userhashmap = {};    
var oldUserHash = [];
var scoreboard = {statusMessage: " "};                   
var port = process.env.PORT || 8080;                    

app.get('/', function(req, res){                       
    res.sendFile(__dirname + '/index.html');            
});
app.use('/assets', express.static('assets'));
app.use('/js', express.static('js'));  
//404
app.use(function(req, res, next) {      
    res.status(404).send('404: Sorry cant find that!');
});

///////////////
// socket.io //
///////////////

//establishes connection with client
io.on('connection', function(socket){ 
    //use: communicateJoin(string)
    //input: (string)status
    //function: updates usecount and scoreboard if user joined
    //          deletes user from scoreboard and userhashmap if he leaves 
    function communicateJoin(status) {
        if (status == '+') {  
             
            usercount += 1;        
            scoreboard[socket.id] = [0, 0]; //[kills, death]
            socket.emit("scoreboard", scoreboard)
        } else if (status == '-') {
            usercount -= 1;
            delete userhashmap[socket.id];    
            delete scoreboard[socket.id];
        }
        console.log(status + socket.id);
        console.log("users: " + usercount);

        for (var x in userhashmap) { 
            console.log(" |  " + x);
        }
    }

    communicateJoin("+");    
    //sends userhashmap to all connected clients
    setInterval(function () { 
        if (usercount > 0) {
            socket.emit('userhashmap', userhashmap);
        }

    }, 100);
    //calls communicatJoin("-") if user leaves
    socket.on('disconnect', function() {                //someone leaves on socket.on('disconnect', ...

        communicateJoin("-");

    });
    //recives data form connected clients runs tests and updates scoreboard
    socket.on('clientinfo', function(msg) {             
        if(typeof userhashmap[socket.id] !== 'undefined'){
            oldUserHash = userhashmap[socket.id];
            
                var tempDistance = Math.sqrt(Math.pow(oldUserHash[0] - msg[0], 2) + Math.pow(oldUserHash[1] - msg[1],2));
                if(tempDistance > 50 && oldUserHash[4] !=false){
                    msg[4] = false;
                    console.log("cheater");
                }   
        }
        userhashmap[socket.id] = msg;                   
        if(msg[5] !== "0" && msg[5] !== oldUserHash[5]){
            userhashmap[msg[5]][4] = false;
            scoreboard[socket.id][0] += 1;
            scoreboard[msg[5]][1] += 1;
            console.log(scoreboard);
            socket.emit('scoreboard', scoreboard);
        }
    });
    //recives call from clients and sends back. Determains ping
    socket.on('bord', function() {
        socket.emit('tennis');
    });

});


http.listen(port, function(){                           //http serving
    console.log('listening on ' + port);
});