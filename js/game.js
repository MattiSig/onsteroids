/* 
Höfundur: Matthías Sigurbjörnsson,  2017
e-Mail: mattisigur@gmail.com

based on some of the code from
https://github.com/vezwork/phasocketonline/blob/master/index.js
*/
/*  global Phaser
    global io*/
var game = new Phaser.Game(800, 600, Phaser.CANVAS, '', { preload: preload, create: create, update: update, render: render });
var socket = io();                                         //initialise socket connection

//loads up a google font used for stateText
WebFontConfig = {
    active: function() { game.time.events.add(Phaser.Timer.SECOND, createText, this); },
    google: {
      families: ['Share Tech Mono']
    }
};

//called by phaser.game to preload sprite and assets
function preload() {                                        //preload our images
    game.load.image('space', 'assets/deep-space.jpg');
    game.load.image('bullet', 'assets/bullets.png');
    game.load.image('ship', 'assets/ship.png');

    game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');

    game.time.advancedTiming = true;
    game.state.disableVisibilityChange = true;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.refresh();

}

var player;
var cursors; 
var userscount = 0;  
var userText;
var loginText = '';
var enemies;
var myx;
var myy;
var imShooting = false;
var myrot;
var userhashmap = {};
var socketid;
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


//create is called by the phaser.game class and creates the objects the game will work with
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

    //other players (enemies) 
    enemies = game.add.group();         
    enemies.enableBody = true;
    enemies.setAll('anchor.x', 0.5);
    enemies.setAll('anchor.y', 0.5);

    // Our bullets
    myBullets = game.add.group();
    myBullets.enableBody = true;
    myBullets.physicsBodyType = Phaser.Physics.ARCADE;

    myBullets.createMultiple(4, 'bullet');
    myBullets.setAll('anchor.x', 0.5);
    myBullets.setAll('anchor.y', 0.5);
    
    //enemy bullets
    enemyBull = game.add.group();
    enemyBull.enableBody = true;
    enemyBull.physicsBodyType = Phaser.Physics.ARCADE;

    enemyBull.createMultiple(40, 'bullet');
    enemyBull.setAll('anchor.x', 0.5);
    enemyBull.setAll('anchor.y', 0.5);
    
    //input cursor
    cursors = game.input.keyboard.createCursorKeys();

    //text objects
    userText = game.add.text(16, 550, 'users: 1', {fontSize: '32px', fill: '#16718F'}); 
    loginText = game.add.text(200, 550, '', {fontSize: '32px', fill: '#36718F'}); 
    userText.fixedToCamera = true;
    loginText.fixedToCamera = true;
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
////////////////////
//   socket.io    //
////////////////////
var startTimePing;
var latency;
var updateUsers;

//every 2 seconds call the bord "function" from server 
//and start a timer
setInterval(function() {
  startTimePing = Date.now();
  socket.emit('bord');
}, 2000);

//recive call from server and document how long it took
//to get a recsponse. This calculates ping
socket.on('tennis', function() {
  latency = Date.now() - startTimePing;
});

//recive other players info and give userhashmap the value
socket.on('userhashmap', function(msg){   
    userhashmap = msg;      
    updateUsers = true;
});

//recieve scorebord info and give scoreBoard its valur
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
//establish socket.io connection with the server
socket.on('connect', function() {
    console.log("hello " + socket.id);
    socketid = socket.id;                     
    //send out array of data about my player to server
    //every 100 ms
    setInterval(function() {

        if (!(socketid in userhashmap)) {
            socket.emit('clientinfo', [myx, myy, myrot, imShooting, imAlive, iKilled]);

        }
        //send only if my status has changed
        else if (userhashmap[socket.id][0] != myx || userhashmap[socket.id][1] != myy 
            || userhashmap[socket.id][2] != myrot || userhashmap[socket.id][3] != imShooting
            || userhashmap[socket.id][4] != imAlive || userhashmap[socket.id][5] !== iKilled) {
            socket.emit('clientinfo', [myx, myy, myrot, imShooting, imAlive, iKilled]);   
        }

        imShooting = false;
        shotTime = [];
        startTimeUser = Date.now();
    }, 100); 
                                         //every 65 ms EDIT
});

//use:      rotateToPos(number,number,number)
//input - (number) radNow, (number) radTarg, (nnumber) ms
//function: calculates radial distance to turn each frame to end up in 
//          target radian(radTarg) from current radion (radNow) in given milliseconds
//returns:  (number)
function rotateToPos(radNow, radTarg, ms){
    var radDistance =  radTarg - radNow;
    if(radDistance < -Math.PI){
        radDistance += Math.PI * 2;
    } else if (radDistance > Math.PI){
        radDistance -= Math.PI * 2; 
    }
    
    return ((radDistance / game.time.physicsElapsed) * (1000/ms));  
}

//main game loop, called by phaser.game to update each frame in the game
//manipulates objects within the game to simulate movement and events
function update() {

    if(updateUsers){
        userscount = 0;
        
        for(var user in userhashmap) {
            userscount += 1;
            var noenemy = true;           
            
            if (user != socketid) {         
                enemies.forEach(function (guy) {  
                    
                    if (guy.name == user) {          
                        noenemy = false;                
                        
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
                
                if (noenemy && userhashmap[user][4] && user != socketid) {  //no enemy has been created for this user, so create one
                    var enemy = enemies.create(userhashmap[user][0], userhashmap[user][1], 'ship');  //create enemy
                    //enemy.tint = '0x' + (Math.round(Math.random()*Math.pow(2, 24))).toString(16);   //random color
                    enemy.name = user;                                //identify the enemy with it's corresponding user
                    enemy.anchor.set(0.5);
                    enemy.oldRot = 0;
                    loginText.text = user.substr(0,5) + '.. joined'; //first time creating a enemy so user just joined
                }
            }
        }
        
        if(socketid in userhashmap){
            
            if(userhashmap[socketid][4]==false){
                killPlayer();
            }
        }
    }
    userText.text = 'users: ' + userscount;
   
    enemies.forEach(function (guy) { 
        var nouser = true;
        for(var user in userhashmap) {
            if (guy.name == user) { 
                nouser = false; 
            }
        }
        if (nouser) {       
            guy.destroy(); 
            loginText.text = guy.name.substr(0,5) + '.. left';
        }
    });
        
    myx = player.x;
    myy = player.y;
    myrot = player.rotation;
    
    //input form user
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

    game.physics.arcade.overlap(myBullets, enemies, collisionHandler, null, this);

    updateUsers = false;
}

//use: fireBullet(object, boolean)
//input: (object) guy, (boolean) isMine
//function: renders bullet from right position and angle of guy
//          checks if guy is enemy or player
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

//use: collisionHandler(object, object)
//function: determains what happens when objects collide
function collisionHandler (myBullet, enemy) {

    if(iKilled !== enemy.name){
        iKilled = enemy.name;
        game.time.events.add(Phaser.Timer.SECOND * 0.3, clearIKilled, this);
    }
}

var loopDeadCounter;
//use: killPlayer()
//function: kills the palyer and start counter
function killPlayer(){
    if(player.alive){
        player.kill();
        imAlive = false;
        if(typeof stateText !== 'undefined'){ stateText.alpha = 1; }
        loopDeadCounter = game.time.events.loop(Phaser.Timer.SECOND, updateCounter, this);
    }    
}

//use: updateCounter()
//funciotn: updates counter
function updateCounter() {
    deadCounter--;
    if(typeof stateText !== 'undefined'){ 
        stateText.setText("You dead ! \n press space to restart in " + deadCounter + "sec");
    }
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
    game.debug.text("fps: " + game.time.fps, 2, 14, "#00ff00");
    game.debug.text("ping: " + latency, 2, 32, "#00ff00");
}
