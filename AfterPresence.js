export default (request) => { 
  const db = require('kvstore');
  const pubnub = require('pubnub');
  
  const presence_type = request.message.action;
  const timestamp = request.message.timestamp;
  const uuid = request.message.uuid;
  
  // Whenever someone leaves, update everyone with the game state
  return db.get("gameState").then((gameState) => {
      if (presence_type == "leave") {
          // Get player's state
          let pState = gameState.playerStates[uuid]
          // If they were an active player, subtract from that count
          if (pState && pState.ready == true && pState.health > 0) {
              if (gameState.activePlayers > 0) {
                  gameState.activePlayers -= 1;
              }
          }
          // Subtract from total player count
          if (gameState.totalPlayers > 0) {
              gameState.totalPlayers -= 1;
          }
          // If this was the last person to leave in an active game, reset
          if (gameState.totalPlayers == 0 && gameState.activePlayers == 0 && gameState.status == "inProgress") {
              gameState.status = "waiting"
          }
          // Remove the player
          delete gameState.playerStates[uuid]
      }
      
      db.set("gameState", gameState)
      .catch((err) => {
          console.log("An error occured saving the random number.", err);
      });
      return request.ok();
  })
}