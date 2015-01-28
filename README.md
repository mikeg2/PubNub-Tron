#PubNub Tron

A two-player implementation of tron using PubNub and CreateJs.

#Code Structure
PubNub Tron has two main parts:

- <strong>The Game</strong> The tron game itself
- <strong>The Lobby</strong> Where users challenge each other to compete

The game has four main parts:

- <strong>Model</strong> <em>(game/model.js)</em> Responsible for keeping state synced accross player devices
- <strong>Game Controller</strong> <em>(game/gameController.js)</em> Adds events to model based on user input (i.e. up, down, left, right key)
- <strong>View</strong> <em>(game/gameView.js)</em>
- <strong>Rule Enforcer</strong> <em>(game/game.js)</em> Watches model to see if any rules have been broken (i.e collisions).

#Networking/Model
The model stores an array of timestamped events for each player (i.e "turn up", "turn down"...). The Model Helper (game/modelHelper.js) converts those events into an array of lines used to draw the user's path.

One player's device is designated the "server" and the other the "client." When the client's controller updates the client's model, the client's model creates a temporary event who's timestamp is the current time. The client model then sends the server model an "event request." The server model responds to the event request with an event object that has an updated timestamp. The client replaces its temporary event with the actual event from the server. This ensures that the timestamps on the client model events match the timestamps on the server model events.

#To Do
- Refactor All Code
- Bug test with multiple computers
- Speed up initialization