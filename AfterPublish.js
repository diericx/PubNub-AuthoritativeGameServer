export default (request) => { 
  const db = require('kvstore');
  const pubnub = require('pubnub');
  
  let DEFAULT_DAMAGE = 10

  // get the message object
  let message = request.message
  
  // Get the game state and perform actions  
  return db.get("gameState").then((gameState) => {
      
      // Get the player's state
      let playerState = gameState.playerStates[message.uuid]
      
      // If any stray messages come in at the wrong time, ignore them
      // This could possibly be a ready before the player has sent their "join" msg
      if (!playerState) {
          console.log("Player not found!")
          return request.ok();
      }
      
      // If player is currently dead, do nothing
      if (playerState.health == 0) {
          return request.ok();
      }
      
      
      if (gameState.status == "waiting") { // If the game is waiting for everyone to ready up
          // update game state if this player is trying to ready up
          if (message.action == "ready") { // player is ready
              // ready up the player
              playerState.ready = true
              // add to active players
              gameState.activePlayers += 1
          }
          
          // If everyone is ready, start the game
          if (gameState.totalPlayers > 0 && gameState.activePlayers == gameState.totalPlayers) {
              console.log("go to in progress")
              gameState.status = "inProgress"
              pubnub.publish({
                  "channel": "game",
                  "message": {
                      "action": "startGame"
                  }
              }) 
          }
      } else if (gameState.status == "inProgress") { // If a game is currently in progress
          // Handle users attacking each other
          if (message.action == "attack") {
              let targetPState = gameState.playerStates[message.targetUuid]
              targetPState.health -= DEFAULT_DAMAGE
              
              // If the target player died, decrement active players
              if (targetPState.health <= 0) {
                  targetPState.health = 0
                  gameState.activePlayers -= 1
              }
              
              // Check to see if this player won
              if (gameState.activePlayers == 1) {
                  // Reset the game
                  gameState = {
                      status: "waiting",
                      totalPlayers: 0,
                      activePlayers: 0,
                      playerStates: {}
                  }
                  pubnub.publish({
                      "channel": "game",
                      "message": {
                          "action": "win",
                          "uuid": message.uuid
                      }
                  }) 
              }
          }
      }
      
      pubnub.publish({
          "channel": "game",
          "message": {
              "action": "updateGameState",
              "gameState": gameState
          }
      })
      
      // Update the game state in the db
      db.set("gameState", gameState).catch((err) => {
          console.log("Error setting game state.", err);
      });
      
      return request.ok();
  });

}