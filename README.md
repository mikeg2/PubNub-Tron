#PubNub Tron

A two-player implementation of tron using PubNub and CreateJs.

#Code Structure
PubNub tron has two main parts:

- <strong>The Game</strong> The tron game itself
- <strong>The Lobby</strong> Where users challenge each other to compete

The game has four main parts:

- <strong>Model</strong> <em>(game/model.js)</em> Responsible for keeping state synced accross player devices
- <strong>Game Controller</strong> <em>(game/gameController.js)</em> Adds events to model based on users input (i.e. up, down, left, right key)
- <strong>View</strong> <em>(game/gameView.js)</em>
- <strong>Rule Enforcer</strong> <em>(game/game.js)</em> Watches model to see if any rules have been broken (i.e collisions).

#Networking/Model
The model stores a series of timestamped events for each player (i.e "turn up", "turn down"...). The Model Helper (game/modelHelper.js) converts those events into an array of lines that correspond to the users path.

One player's device is designated the "server" and the other the "client." In order to ensure that they When the controller adds an event to the client's model, the model creates a temporary event with a temporary timestamp. The client model then sends the server model an "event request." The server responds to the event request with an event object, which has a timestamp. The client replaces the temporary event with the actual event from the server. This ensures that the timestamps on the client model's events match the timestamps on the server model's events.

#To Do
- Refactor All Code
- Bug test with multiple computers
- Speed up initialization