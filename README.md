# PubNub Tron

A two-player implementation of tron using PubNub and CreateJs.

# Code Structure
PubNub tron has two main parts:

- <strong>The Game:</strong> The tron game itself
- <strong>The Lobby:</strong> Where users challenge eachother to compete

The game has four main parts:

- <strong>Model</strong> <em>(See game/model.js)</em> Responsible for keeping state synced accross player devices
- <strong>Game Controller</strong> <em>(See game/gameController.js)</em> Adds events to model based on users input (i.e. up, down, left, right key)
- <strong>View</strong> <em>(See game/gameView.js)</em>

#To Do
- Refactor All Code
- Bug test with multiple computers
- Speed up initialization