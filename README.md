# PubNub Tron

A two-player implementation of tron using PubNub and CreateJs.

# Code Structure
PubNub tron has two main parts:
    - <s>The Game:</s> The tron game itself
    - <s>The Lobby:</s> Where users challenge eachother to compete

The game has four main parts:
    - <s>Model</s> <em>(See game/model.js)</em> Responsible for keeping state synced accross player devices
    - <s>Game Controller</s> <em>(See game/gameController.js)</em> Adds events to model based on users input (i.e. up, down, left, right key)
    - <s>View</s> <em>(See game/gameView.js)</em>

#To Do
    - Refactor All Code
    - Bug test with multiple computers
    - Speed up initialization