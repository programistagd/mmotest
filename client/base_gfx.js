
allEntities = {};
playerSpeed = tileSize*1.8;
function createPlayer(x,y){
   var player = game.add.sprite(x,y, 'player');//game.add.tileSprite(300, 310, 64, 64, 'player');
   player.anchor.x = player.anchor.y = 0;
   player.depth = 200;
   player.previous = player.position;
   player.target = {x:x, y:y};
   preparePlayerAnimations(player);
   //allPlayers.push(player);
   player.type="player";
   return player;
}
function updatePlayer(player){
  if(player.nameText){
    player.nameText.destroy(true);
  }
  player.nameText = game.add.text(tileSize/2,tileSize,player.name,{fontSize: 4, fill: '#ffff10', stroke: '#000000', strokeThickness: 2});
  player.nameText.anchor = {x:0.5,y:0};
  player.addChild(player.nameText);
}
function createEntity(x,y,img){
   var e = game.add.sprite(x,y, 'player');
   e.anchor.x = e.anchor.y = 0;
   e.depth = 200;
   e.previous = e.position;
   e.target = {x:x, y:y};
   //   preparePlayerAnimations(player);//TODO
   e.type="entity";
   return e;
}
function preparePlayerAnimations(player){
   //set-up player anims
   player.animations.add("idle", [130],1,true);
   player.animations.add("walkUp", [105,106,107,108,109,110,111,112],10,true);//8*13=104
   player.animations.add("walkLeft", [118,119,120,121,122,123,124,125],10,true);
   player.animations.add("walkDown", [131,132,133,134,135,136,137,138],10,true);
   player.animations.add("walkRight", [144,145,146,147,148,149,150,151],10,true);
   player.animations.play("idle");
}
function updateEntity(e){
   if(e.type=="player"){
      animate(e);
      return;
   }
   if(e.movementType=="static"){
      e.x=e.target.x;
      e.y=e.target.y;
   }else{
      if(Math.abs(e.x-e.target.x)>2 || Math.abs(e.y-e.target.y)>2){
         //we need to move
         var dx = e.target.x - e.x;
         var dy = e.target.y - e.y;
         var len = Math.sqrt(dx*dx+dy*dy);
         var spd=playerSpeed/game.time.fps;
         if(len>chunkSize*tileSize){
            len = 0.2*chunkSize*tileSize;//make big errors compensate quickly
         }
         dx= (dx/len)*spd;
         dy= (dy/len)*spd;
         e.x += dx;
         e.y += dy;
      }
   }
}
function animate(player){
   //movement
   if(Math.abs(player.x-player.target.x)>2 || Math.abs(player.y-player.target.y)>2){
      //we need to move
      var dx = player.target.x - player.x;
      var dy = player.target.y - player.y;
      var len = Math.sqrt(dx*dx+dy*dy);
      var spd=playerSpeed/game.time.fps;
      if(len>chunkSize*tileSize){
         len = 0.2*chunkSize*tileSize;//make big errors compensate quickly
      }
      dx= (dx/len)*spd;
      dy= (dy/len)*spd;
      player.x += dx;
      player.y += dy;
   }
   //animations
   var vx = player.x - player.previous.x;
   var vy = player.y - player.previous.y;
   if(vx>0.1){player.animations.play("walkRight");}
   else if(vx<-0.1){player.animations.play("walkLeft");}
   else if(vy>0){player.animations.play("walkDown");}
   else if(vy<0){player.animations.play("walkUp");}
   else{
      if(player!=window.player || window.player.canMove){//local player jitter anim hack
         player.animations.play("idle");
      }
   }

   player.previous = {x:player.x,y:player.y};
}
window.onload = function() {
   game = new Phaser.Game(1280, 720, Phaser.AUTO, 'game', { preload: preload, create: create, update: update, render: render });

   function preload () {
      game.time.advancedTiming = true;
      game.load.spritesheet('tile1', 'assets/tiles.png', 64, 64);
      game.load.spritesheet('player', 'assets/player.png', 64, 64);
   }
   function create () {
      game.stage.backgroundColor = '#222235';
      cursors = game.input.keyboard.createCursorKeys();
      game.input.mouse.mouseDownCallback = genericOnMouseDown;

      game.world.setBounds(0,0,7*chunkSize*tileSize,7*chunkSize*tileSize);

      player = createPlayer(3.5*chunkSize*tileSize, 3.5*chunkSize*tileSize);
      player.canMove = true;
      game.physics.arcade.enable(player);
      game.camera.follow(player);

      startNetworking();
      prepareUI();
   }

   function controls(){
      if(!player.canMove){
         var dx = player.target.x - player.x;
         var dy = player.target.y - player.y;
         if(dx*dx+dy*dy<10){
            player.canMove = true;
         }
      }

      if(player.canMove){
         if (cursors.left.isDown){
            player.target.x-=tileSize;
            player.canMove = false;
            sendMoved(-1,0);
         }
         if (cursors.right.isDown){
            player.target.x+=tileSize;
            player.canMove = false;
            sendMoved(1,0);
         }
         if (cursors.down.isDown){
            player.target.y+=tileSize;
            player.canMove = false;
            sendMoved(0,1);
         }
         if (cursors.up.isDown){
            player.target.y-=tileSize;
            player.canMove = false;
            sendMoved(0,-1);
         }
      /*if (cursors.right.isDown){player.body.velocity.x += v;}
      if (cursors.up.isDown){player.body.velocity.y += -v;}
      if (cursors.down.isDown){player.body.velocity.y += v;}*/

         /*if(!player.canMove){
            setTimeout(function(){
               //player.canMove = true;//now a speed based solution
            }, 900*(playerSpeed/tileSize));
         }*/
      }
   }
   function update(){
      if(!authenticated) return;

      //player.body.velocity.x = 0;player.body.velocity.y = 0;
      controls();
      animate(player);
      for(var id in allEntities){
         var e = allEntities[id];
         //console.log(e.x,e.y,e.target);
         updateEntity(e);
      }
      updateTerrains();

      game.world.sort('depth');
   }
   function render(){
      var fps = "--";
      var png = "No connection";
      if(game.time.fps){
         fps = game.time.fps+"fps";
      }
      if(ping){
         png = ping+"ms";
      }
      game.debug.text(fps+" | "+png, 2, 14, "#ffff00",'bold 16px Courier');
      if(!authenticated){
         game.debug.text("Waiting for authentication", 50, 200, "#ffff30");
      }
   }
};
