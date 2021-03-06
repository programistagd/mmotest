pendingTransfers = {};

function str2ab(str) {
   //var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
   var bufView = new Uint16Array(str.length);
   for (var i=0, strLen=str.length; i<strLen; i++) {
      bufView[i] = str.charCodeAt(i);
   }
   return bufView;
}
var compressor = new LZ77();
function decompressChunk(chunk){
   return str2ab(compressor.decompress(chunk));
}


function serverToLocalPos(x,y){
   return {
         x: (x-currentTerrainPos.x*chunkSize)*tileSize,
         y: (y-currentTerrainPos.y*chunkSize)*tileSize,
   };
}
authenticated = false;
protocolInitialized = false;
function setUpProtocol(){
   socket.on('authFailed', function(){
      alert("Authentication failed");
      authenticated = false;
   });
   socket.on('init', function(data){
      authenticated = true;
      player.id = data.id;
      player.x = data.x*tileSize;
      player.target.x = data.x*tileSize;
      player.y = data.y*tileSize;
      player.target.y = data.y*tileSize;
      log("Local id set to "+data.id);
   });
   socket.on('addEntity', function(data){
      console.log(data.id);
      //console.log(data);
      if(data.id==player.id){
         //TODO if it's me I can still download clothing here!!
         player.name = data.name;
         updatePlayer(player);
         return;//it's me hey
      }
      var pos;
      if(data.type=='player'){
         pos = serverToLocalPos(data.x, data.y);
         var p = createPlayer(pos.x,pos.y);
         p.id = data.id;
         p.name = data.name;
         //log("Joins: "+data.name);
         updatePlayer(p);
         allEntities[p.id] = p;
      }else{
         //entity
         pos = serverToLocalPos(data.x, data.y);
         var e = createEntity(pos.x,pos.y,data.img);
         e.id = data.id;
         e.movementType = data.movementType;
         allEntities[e.id] = e;
      }
   });
   socket.on('removeEntity', function(data){
      //console.log("removing", data);
      if(data.id==player.id){
         return;//it's me hey//TODO sure?
      }
      allEntities[data.id].destroy(true);
      delete allEntities[data.id];
   });
   socket.on('entityMoved', function(data){
      //console.log(data);
      var pos = serverToLocalPos(data.x, data.y);
      if(data.id==player.id){
         //still update my target
         player.target.x = pos.x;
         player.target.y = pos.y;
         return;
      }
      allEntities[data.id].target = pos;
   });
   socket.on('cannotMove', function(data){
      var pos = serverToLocalPos(data.x, data.y);
      player.x = pos.x;
      player.y = pos.y;
      player.target.x = pos.x;
      player.target.y = pos.y;
   });
   socket.on('chunk', function(data){
      //console.log(data);
      //TODO: cache
      var x = data.x;
      var y = data.y;
      onChunkReceived(decompressChunk(data.chunk), {x:x,y:y});
      delete pendingTransfers[(x)+'x'+(y)];
   });
   socket.on('chat_message', function(data){
      var sayer;
      for(var i=0;i<allPlayers.length;i++){
         if(allPlayers[i].id==data.id){
            sayer = allPlayers[i];
         }
      }
      log("["+(sayer.name || data.id)+"] "+data.text);
      var txt = game.add.text(sayer.x, sayer.y, data.text, {fontSize: 12, fill: '#ffff10', stroke: '#000000', strokeThickness: 5});
      var anim = game.add.tween(txt);
      anim.onComplete.add(function(){
         txt.destroy(true);
      });
      anim.to({y: sayer.y-tileSize, alpha: 0}, 1500, Phaser.Easing.Linear.None, true, 2000);
   });
   socket.on('message', function(message){
      var txt = game.add.text(10, 680, message, {fontSize: 12, fill: '#ff9a10', stroke: '#000000', strokeThickness: 4});
      txt.fixedToCamera = true;
      var anim = game.add.tween(txt);
      anim.onComplete.add(function(){
         txt.destroy(true);
      });
      anim.to({y: 680-tileSize, alpha: 0}, 1500, Phaser.Easing.Linear.None, true, 2000);
   });
   socket.on('updateInventory',function(code){
      inventoryCode = code;
      if(inventoryOpen){
         removeUI("_inventory");
         createUI(inventoryCode,"_inventory");
      }
   });
   protocolInitialized = true;
}

function disconnectHandler(){
   //we've been disconnected, clean up the session

   //remove all players but me
   allPlayers.forEach(function(p){
      if(p!=player){
         p.destroy(true);
      }
   });
   allPlayers = [player];
}

function requestChunk(x,y){
   pendingTransfers[(x)+'x'+(y)] = true;
   //TODO cache
   socket.emit('requestChunk',{x:x,y:y});
}

function sendMoved(dx,dy){
   socket.emit('moved', {x:dx,y:dy});
}

function sendPlaceBlock(x,y,layer,id){
   socket.emit('placeBlock',{x:x,y:y,z:layer,id:id});
}
