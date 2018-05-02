export default (request) => { 
  const db = require('kvstore');
  const pubnub = require('pubnub');
  
  // get the message object
  let message = request.message

  return db.get("gameState").then((gameState) => {
      
      // If the user is trying to join, let em!
      if (message.action == "join") {
          if (!gameState.playerStates[message.uuid]) {
              gameState.playerStates[message.uuid] = {
              ready: false,
              health: 100
              }
              gameState.totalPlayers += 1
              // Send the new state to everyone
              pubnub.publish({
                  "channel": "game",
                  "message": {
                      "action": "updateGameState",
                      "gameState": gameState
                  }
              })
          }
      }
      
      // if the gameState doesn't exist, create it
      if (!gameState || request.message.action == "reset-gamestate") {
          // default gameState object
          gameState = {
              status: "waiting",
              totalPlayers: 0,
              activePlayers: 0,
              playerStates: {}
          }
          
      }
      
      db.set("gameState", gameState)
      .catch((err) => {
          console.log("An error occured saving the random number.", err);
      });
      
      return request.ok();
  });
}