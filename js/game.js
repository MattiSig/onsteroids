
/*global Phaser*/
/*global io*/
var game = new Phaser.Game(800, 600, Phaser.CANVAS, '', { preload: preload, create: create, update: update, render: render });
var socket = io();                                         //initialise socket connection

WebFontConfig = {
    active: function() { game.time.events.add(Phaser.Timer.SECOND, createText, this); },
    google: {
      families: ['Share Tech Mono']
    }
};


function preload() {                                        //preload our images
    game.load.image('sky', 'assets/sky.png');
    game.load.image('ground', 'assets/platform.png');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
    game.load.image('space', 'assets/deep-space.jpg');
    game.load.image('bullet', 'assets/bullets.png');
    game.load.image('ship', 'assets/ship.png');
    game.load.image('clown', 'assets/clown.png');

    game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');

    game.time.advancedTiming = true;
    game.state.disableVisibilityChange = true;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.refresh();

}

var platforms;          //these variables are explained inline
var player;
var cursors; 
var userscount = 0;  
var userText;
var loginText = '';
var buddys;
var myx;
var myy;
var imShooting = false;
var myrot;
var userhashmap = {};
var socketid;
var buddydistancetimer;
var bullet;
var bullets;
var bulletTime = 0;
var imAlive = true;
var iKilled = "0";
var scoreBoard = "User \t kills \t deaths \n";

var stateText;
var scoreText;
var deadCounter = 11;
var canRestart;


function create() {
    game.stage.disableVisibilityChange = true;
        
    game.world.resize(1500, 1500);
    
    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.add.tileSprite(0,0,1500,1500, 'space');
    
    //player
    player = game.add.sprite(100, 100, 'ship');
    game.physics.arcade.enable(player);
    player.body.drag.set(50);
    player.body.maxVelocity.set(300); 
    player.anchor.set(0.5);
    game.camera.follow(player);
    player.body.collideWorldBounds = true;
    player.enableBody = true;

    //other players (buddy) 
    buddys = game.add.group();                      //buddys represent the other connected players
    buddys.enableBody = true;
    buddys.setAll('anchor.x', 0.5);
    buddys.setAll('anchor.y', 0.5);

    cursors = game.input.keyboard.createCursorKeys();

    userText = game.add.text(16, 16, 'users: 1', {fontSize: '32px', fill: '#16718F'});  //displays num users online
    loginText = game.add.text(200, 16, '', {fontSize: '32px', fill: '#36718F'});      //displays user join and leave

    //  Our ships bullets
    myBullets = game.add.group();
    myBullets.enableBody = true;
    myBullets.physicsBodyType = Phaser.Physics.ARCADE;

    //  All 40 of them
    myBullets.createMultiple(4, 'bullet');
    myBullets.setAll('anchor.x', 0.5);
    myBullets.setAll('anchor.y', 0.5);
        
    enemyBull = game.add.group();
    enemyBull.enableBody = true;
    enemyBull.physicsBodyType = Phaser.Physics.ARCADE;

    enemyBull.createMultiple(40, 'bullet');
    enemyBull.setAll('anchor.x', 0.5);
    enemyBull.setAll('anchor.y', 0.5);

    scoreText = game.add.text(400, 300, scoreBoard);
    scoreText.anchor.setTo(0.5);
    scoreText.fontSize = 14;
    scoreText.align = 'center';
    scoreText.fixedToCamera = true;
    scoreText.alpha = 0;
    scoreText.fill = '#ffffff';

}   

function createText()
{
    stateText = game.add.text(400, 300, "A");
    stateText.anchor.setTo(0.5);

    stateText.font = 'Share Tech Mono';
    stateText.fontSize = 30;
    stateText.align = 'center';
    stateText.fixedToCamera = true;
    stateText.fill = '#ffffff';
    stateText.alpha = 0;


}
//socket.io

var startTimePing;
var latency;
var updateUsers;

setInterval(function() {
  startTimePing = Date.now();
  socket.emit('bord');
}, 2000);

socket.on('tennis', function() {
  latency = Date.now() - startTimePing;
  //console.log(latency);
});

socket.on('userhashmap', function(msg){             //receive other player's info
    userhashmap = msg;                             //put the other player's info into userhashmap
    updateUsers = true;
});

socket.on('scoreboard', function(msg){
    scoreBoard = "User \t kills \t deaths \n";
    var msgArray = Object.keys(msg);
    for(i = 1; i < msgArray.length; i++){
        var userId = msgArray[i];
        scoreBoard = scoreBoard + "" + userId.substr(0,5) + " \t\t " + msg[userId][0] + " \t\t " + msg[userId][1] + "\n";
    }
});

var startTimeUser;
var shotTime = [];
socket.on('connect', function() {
    console.log("hello " + socket.id);
    socketid = socket.id;                           //store socket.id for use in the game

    setInterval(function() {
        //send info about your character to the server
        //if-else if for only sending data if the character has moved
        if (!(socketid in userhashmap)) {
            socket.emit('clientinfo', [myx, myy, myrot, imShooting, imAlive, iKilled]);

        }
        else if (userhashmap[socket.id][0] != myx || userhashmap[socket.id][1] != myy 
            || userhashmap[socket.id][2] != myrot || userhashmap[socket.id][3] != imShooting
            || userhashmap[socket.id][4] != imAlive || userhashmap[socket.id][5] !== iKilled) {
            socket.emit('clientinfo', [myx, myy, myrot, imShooting, imAlive, iKilled]);   
        }
        //
        //iKilled = "0";
        imShooting = false;
        shotTime = [];
        startTimeUser = Date.now();
    }, 100); 
                                         //every 65 ms EDIT
});
function rotateToPos(radNow, radTarg, ms){
    var radDistance =  radTarg - radNow;
    if(radDistance < -Math.PI){
        radDistance += Math.PI * 2;
    } else if (radDistance > Math.PI){
        radDistance -= Math.PI * 2; 
    }
    
    return ((radDistance / game.time.physicsElapsed) * (1000/ms));  

}

function update() {
    //buddy control
    //Phaser.time.physicsElapsed = 1/game.time.fps;

    if(updateUsers){
        userscount = 0;
        for(var user in userhashmap) {                  //iterate through all connected players
            userscount += 1;
            var nobuddy = true;                         //flag for if a buddy has been created for this user already
            if (user != socketid) {                     //if the connected user isn't you
                buddys.forEach(function (guy) {         //iterate through current representations of players
                    if (guy.name == user) {             //if a guy (individual buddy) has already been created
                        //***manipulating buddys already present in room***
                        nobuddy = false;                //a buddy has already been created for this user
                        
                        game.physics.arcade.moveToXY(guy,userhashmap[guy.name][0],userhashmap[guy.name][1], 0, 100);
                        
                        guy.body.angularVelocity = 0;
                        guy.rotation = guy.oldRot;
                        guy.body.angularVelocity = rotateToPos(guy.rotation, userhashmap[guy.name][2], 100);

                        guy.oldRot = userhashmap[guy.name][2];

                        if(userhashmap[guy.name][3]){
                            fireBullet(guy, false);
                        }
                        if(!userhashmap[guy.name][4]){
                            guy.destroy();                 //drepaóvin ÞARF AÐ EYÐA .destroya
                        }

                    }
                },this);
                if (nobuddy && userhashmap[user][4] && user != socketid) {  //no buddy has been created for this user, so create one
                    var buddy = buddys.create(userhashmap[user][0], userhashmap[user][1], 'ship');  //create buddy
                    //buddy.tint = '0x' + (Math.round(Math.random()*Math.pow(2, 24))).toString(16);   //random color
                    buddy.name = user;                                //identify the buddy with it's corresponding user
                    buddy.anchor.set(0.5);
                    buddy.oldRot = 0;
                    loginText.text = user.substr(0,5) + '.. joined'; //first time creating a buddy so user just joined
                }
            } else {            //if user is you
                buddys.forEach(function (guy){
                    if(guy.name == user) {}
                });
            }
        }
        if(socketid in userhashmap){
            if(userhashmap[socketid][4]==false){
                killPlayer();
            }
        }
    }
    userText.text = 'users: ' + userscount; //update displayed ammount of 
    //destroy buddies if they are not in the hashmap (the user left the game)
    buddys.forEach(function (guy) { //iterate through all buddys
        var nouser = true;
        for(var user in userhashmap) {
            if (guy.name == user) { //if the buddy represents a documented user
                nouser = false;     //then make sure he is not destroyed
            }
        }
        if (nouser) {               //if the user is gone from the hashmap but the buddy still exists
            guy.destroy();          //destroy that buddy
            loginText.text = guy.name.substr(0,5) + '.. left';  //tell the player that the user left the game
        }
    });


    game.physics.arcade.collide(player, platforms);

    game.physics.arcade.collide(buddys, platforms);
    
    game.physics.arcade.collide(buddys);
    
    //player.body.velo
    
    myx = player.x;
    myy = player.y;
    myrot = player.rotation;
    
    //player.rotation = game.physics.arcade.moveToPointer(player, 60, game.input.activePointer, 500);

    if (cursors.up.isDown) {
        game.physics.arcade.accelerationFromRotation(player.rotation, 200, player.body.acceleration);
    } else {
        player.body.acceleration.set(0);
    }

    if (cursors.left.isDown) {
        player.body.angularVelocity = -300;
    } else if (cursors.right.isDown) {
        player.body.angularVelocity = 300;
    } else {
        player.body.angularVelocity = 0;
    }
    
    if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) && imAlive ) {
        fireBullet(player, true);
    } else if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) && canRestart){
        
        stateText.alpha = 0;
        deadCounter = 11;
        revivePlayer();

    } else {

    }

    if (game.input.keyboard.isDown(Phaser.Keyboard.S)) {
        scoreText.text = scoreBoard;
        scoreText.alpha = 1;
    } else {
        scoreText.alpha = 0;
    }
    //console.log(userhashmap);
    game.physics.arcade.overlap(myBullets, buddys, collisionHandler, null, this);

    updateUsers = false;
}

function fireBullet (guy, isMine) {
    
    if (isMine && game.time.now > bulletTime) {
        
        bullet = myBullets.getFirstExists(false);

        if (bullet) {
            bullet.reset(guy.x + (Math.cos(guy.rotation)*32), guy.y + (Math.sin(guy.rotation)*32));
            bullet.lifespan = 900;
            bullet.rotation = guy.rotation;
            game.physics.arcade.velocityFromRotation(guy.rotation, 400, bullet.body.velocity);
            bulletTime = game.time.now + 200;
            imShooting = true;
            shotTime.push(Date.now() - startTimeUser);
        }
    } else if (!isMine) {
        bullet = enemyBull.getFirstExists(false);

        if (bullet) {
            bullet.reset(guy.x + (Math.cos(guy.rotation)*32), guy.y + (Math.sin(guy.rotation)*32));
            bullet.lifespan = 900;
            bullet.rotation = guy.rotation;
            game.physics.arcade.velocityFromRotation(guy.rotation, 400, bullet.body.velocity);

        }
    }
}

/*function velocityFromRotationVelo (rotation, speed, point) {

    if (speed === undefined) { speed = 60; }
    point = point || new Phaser.Point();

    return point.setTo(player.body.velocity.x + (Math.cos(rotation) * speed), player.body.velocity.y + (Math.sin(rotation) * speed));
}*/

function collisionHandler (myBullet, buddy) {

    if(iKilled !== buddy.name){
        iKilled = buddy.name;
        game.time.events.add(Phaser.Timer.SECOND * 0.3, clearIKilled, this);
    }
}

var loopDeadCounter;
function killPlayer(){
    if(player.alive){
        player.kill();
        imAlive = false;
        if(typeof stateText !== 'undefined'){ stateText.alpha = 1; }
        loopDeadCounter = game.time.events.loop(Phaser.Timer.SECOND, updateCounter, this);
    }    
}

function updateCounter() {
    deadCounter--;
    stateText.setText("You dead ! \n press space to restart in " + deadCounter + "sec");
    
    if(deadCounter <= 0){
        canRestart = true;
        game.time.events.remove(loopDeadCounter);
    }
}

function revivePlayer() {
    player.reset( Math.floor((Math.random() * 1400) + 50), Math.floor((Math.random() * 1400) + 50))
    imAlive = true;
}

function clearIKilled(){
    iKilled = "0";
}

function render() {
    //game.debug.body(player);
    game.debug.text("fps: " + game.time.fps, 2, 14, "#00ff00");
    game.debug.text("ping: " + latency, 2, 32, "#00ff00");
    game.debug.text( player.rotation, 2, 50, "#00ff00");
}
