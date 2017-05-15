
/*global Phaser*/
/*global io*/
var game = new Phaser.Game(800, 600, Phaser.CANVAS, '', { preload: preload, create: create, update: update, render: render });
var socket = io();                                          //initialise socket connection

function preload() {                                        //preload our images
    game.load.image('sky', 'assets/sky.png');
    game.load.image('ground', 'assets/platform.png');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
    game.load.image('space', 'assets/deep-space.jpg');
    game.load.image('bullet', 'assets/bullets.png');
    game.load.image('ship', 'assets/ship.png');
    game.load.image('clown', 'assets/clown.png');

    game.time.advancedTiming = true;
    game.state.disableVisibilityChange = true;
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
var mybull = false;
var myrot;
var userhashmap = {};
var socketid;
var buddydistancetimer;
var bullet;
var bullets;
var bulletTime = 0;
var imAlive = true;


function create() {
    game.stage.disableVisibilityChange = true;
        
    game.world.resize(3000, 3000);
    
    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.add.tileSprite(0,0,3000,3000, 'space');
    
    //player
    player = game.add.sprite(Math.floor((Math.random() * 2900) + 50), Math.floor((Math.random() * 2900) + 50), 'ship');
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
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;

    //  All 40 of them
    bullets.createMultiple(4, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);
    
    
}

//socket.io

var startTime;
var updateUsers;

socket.on('userhashmap', function(msg){             //receive other player's info
    userhashmap = msg;                             //put the other player's info into userhashmap
    updateUsers = true;
});

socket.on('connect', function() {
    console.log("hello " + socket.id);
    socketid = socket.id;                           //store socket.id for use in the game

    setInterval(function() {                        //send info about your character to the server
        //if-else if for only sending data if the character has moved
        if (!(socket.id in userhashmap)) {
            socket.emit('clientinfo', [myx, myy, myrot, mybull, imAlive]);
        }
        else if (userhashmap[socket.id][0] != myy || userhashmap[socket.id][1] != myx || userhashmap[socket.id][2] != myrot) {
            socket.emit('clientinfo', [myx, myy, myrot, mybull, imAlive]);
        }
    }, 100);                                       //every 65 ms EDIT
});

function update() {
    //buddy control
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
                        guy.rotation = userhashmap[guy.name][2];
                        
                        if(userhashmap[guy.name][3]){
                            fireBullet(guy);
                        }
                        if(!userhashmap[guy.name][4]){
                            guy.kill();                 //drepaóvin ÞARF AÐ EYÐA .destroya
                        }
                        //above: interpolate the guy's position to the current one
                        //below: checks if a guy gets too far away from where hes supposed to be and deals with it.
                        if (game.physics.arcade.distanceToXY(guy,userhashmap[guy.name][0],userhashmap[guy.name][1]) > 60) { //arbitrary 60 can be fiddled with
                            buddydistancetimer += 1;
                            if (buddydistancetimer > 10) { //arbitrary 10 can be fiddled with
                                guy.body.position.x = userhashmap[guy.name][0]; //snaps to non-interpolated position
                                guy.body.position.y = userhashmap[guy.name][1]; //if too far away from it
                            }
                        } else buddydistancetimer = 0;

                    }
                },this);
                if (nobuddy) {  //no buddy has been created for this user, so create one
                    var buddy = buddys.create(userhashmap[user][0], userhashmap[user][1], 'ship');  //create buddy
                    //buddy.tint = '0x' + (Math.round(Math.random()*Math.pow(2, 24))).toString(16);   //random color
                    buddy.name = user;                                //identify the buddy with it's corresponding user
                    buddy.anchor.set(0.5);
                    
                    loginText.text = user.substr(0,5) + '.. joined'; //first time creating a buddy so user just joined
                }
            } else {            //if user is you
                buddys.forEach(function (guy){
                    if(guy.name == user) {

                    }
                })
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

    if(updateUsers){
        console.log("mhm");   
    }


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
    
    if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
        mybull = true;
        fireBullet(player);
    } else {
        mybull = false;
    }
    //console.log(userhashmap);
    game.physics.arcade.overlap(bullets, player, collisionHandler, null, this);

    updateUsers = false;
}

function fireBullet (guy) {
    
    if (game.time.now > bulletTime) {
        bullet = bullets.getFirstExists(false);

        if (bullet) {
            bullet.reset(guy.x + (Math.cos(guy.rotation)*32), guy.y + (Math.sin(guy.rotation)*32));
            bullet.lifespan = 700;
            bullet.rotation = guy.rotation;
            game.physics.arcade.velocityFromRotation(guy.rotation, 400, bullet.body.velocity);
            bulletTime = game.time.now + 50;
        }
    }
}

function velocityFromRotationVelo (rotation, speed, point) {

    if (speed === undefined) { speed = 60; }
    point = point || new Phaser.Point();

    return point.setTo(player.body.velocity.x + (Math.cos(rotation) * speed), player.body.velocity.y + (Math.sin(rotation) * speed));
}

function collisionHandler (player, bullet) {

    player.kill();
    imAlive = false;

}

function render() {
    //game.debug.body(player);
    game.debug.text(game.time.fps, 2, 14, "#00ff00");
}