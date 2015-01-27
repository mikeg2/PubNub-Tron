var LOBBY_NAME = "";
var LOBBY_NAME_SUFFIX = "-lobby";
var MY_UUID = randomString(7);
var MY_USERNAME = "";
var BASE_CHANNEL_NAME = "demo";

var CONNECTION_SETTINGS = {
        publish_key: 'pub-c-b5297e29-6bc0-49a8-8af9-6f8b2419f048',
        subscribe_key: 'sub-c-e96aef6a-9ba2-11e4-951c-0619f8945a4f',
        uuid: MY_UUID,
        origin: 'pubsub.pubnub.com'
    };

var pubnub = PUBNUB.init(CONNECTION_SETTINGS);

// TODO: Possibly refactor into a class? Too many states for purely functional programming

$(function() {
    startView();
});

/* Lobby View */

$("#username-form").submit(function(e) {
    e.preventDefault();
    e.returnValue = false;

    var username = $('#username-form input#username').val();
    $('.username-value').text(username);
    MY_USERNAME = username;
    enterLobby(MY_UUID, MY_USERNAME);
    lobbyView();
});

/* Lobby */
(function initLobbyName() {
    var baseChannel = getBaseChannelName();
    LOBBY_NAME = baseChannel + LOBBY_NAME_SUFFIX;
})();

function getBaseChannelName() {
    return BASE_CHANNEL_NAME; // TODO: Make this come from the Url
}

function enterLobby(myId, username) {
    //listenForCurrentUsers(myId);
    startSubscribeCall(myId, username);
}

function leaveLobby() {
    pubnub.unsubscribe({
        channel: LOBBY_NAME
    });
}

function startSubscribeCall(myId, username) {
    pubnub.subscribe({
        channel: LOBBY_NAME,
        state: {
            username: username
        },
        heartbeat: 6,
        presence: handlePresence,
        message: function(msg) {
            if (msg.challenge && msg.challenge.target == MY_UUID) {
                var action = msg.challenge.action;
                if (action == 'request') {
                    handleChallengeRequest(msg.challenge);
                } else if (action == 'response') {
                    handleChallengeResponse(msg.challenge);
                }
            }
        }
    });
}

function handlePresence(data) {
    if (data.action == 'join') {
        if (data.uuid == MY_UUID) {
            return;
        }
        console.log("JOIN CALLS");
        pubnub.state({
            channel: LOBBY_NAME,
            uuid: data.uuid,
            callback: function(state) {
                addUserToView({
                    uuid: data.uuid,
                    state: state
                });
            }
        });
    }

    if(data.action == "leave" || data.action == "timeout") {
        removeUserFromView(data);
    }
}

function listenForCurrentUsers(myId) {
    pubnub.here_now({
        channel: LOBBY_NAME,
        state: true,
        callback: function(data) {
            console.log("DATA: ", data);
            for (var i = data.uuids.length - 1; i >= 0; i--) {
                if (data.uuids == myId) {
                    return;
                }
                var user = data.uuids[i];
                addUserToView(user);
            }
        }
    });
}

function addUserToView(data) {
    console.log("USER TO ADD: ", data);
    var $new_user = $('<li class="list-group-item" id="' + data.uuid + '" > ' + data.state.username + '</li>');
    $('#online-users').append($new_user);
}

function removeUserFromView(data) {
    $('#' + data.uuid).remove();
}

function challenge(myId, username, userId) {
    pubnub.publish({
        channel: LOBBY_NAME,
        message: {
            challenge: { // NOTE: I combined the "payload" and "type" fields into one by making the "type" value the key of "message", which reduces footprint
                action: 'request',
                uuid: myId,
                username: username,
                target: userId
            }
        },
        callback: waitingView
    });
}

function handleChallengeRequest(challenge) {
    var response = confirm(challenge.username + " is challenging you to a game. Press OK to accept or Cancel to deny?");
    var info = respondToChallenge(challenge, response);
    var privateChannel = info.privateChannel;
    var startTime = info.startTime;
    if (response) {
        waitForGameToStart({
            channel: privateChannel,
            server: true,
            opponentId: challenge.uuid,
            startTime: startTime
        });
    }

}

function respondToChallenge(challenge, response) {
    var privateChannel = response ? randomString(10) : undefined;
    var startTime = new Date().getTime() + 3000;
    pubnub.publish({
        channel: LOBBY_NAME,
        message: {
            challenge: {
                action: 'response',
                accepted: response,
                uuid: challenge.target,
                target: challenge.uuid,
                privateChannel: privateChannel,
                startTime: startTime // FIXME: This is a lazzy way to make sure both models are ready
            }
        }
    });
    return {
        privateChannel: privateChannel,
        startTime: startTime
    };
}

function handleChallengeResponse(challengeResponse) {
    var response = challengeResponse.accepted;
    console.log("RESPONSE: ", response);
    if (response) {
        waitForGameToStart({
            channel: challengeResponse.privateChannel,
            server: false,
            opponentId: challengeResponse.uuid,
            startTime: challengeResponse.startTime
        });
    } else {
        lobbyView();
    }
}

function waitForGameToStart(config) {
    leaveLobby();
    gameView();
    config.canvas = "#game-canvas";
    config.myId = MY_UUID;
    Game.create(config).startGame(config.startTime);
}

/* Views */

function waitingView() {
    $('#start-view-container').hide();
    $('#game-view-container').hide();
    $('#lobby-view-container').hide();
    $('#waiting-view-container').show();
}

function lobbyView() {
    $('#start-view-container').hide();
    $('#game-view-container').hide();
    $('#lobby-view-container').show();
    $('#waiting-view-container').hide();
}

function gameView() {
    $('#start-view-container').hide();
    $('#game-view-container').show();
    $('#lobby-view-container').hide();
    $('#waiting-view-container').hide();
}

function startView() {
    $('#start-view-container').show();
    $('#game-view-container').hide();
    $('#lobby-view-container').hide();
    $('#waiting-view-container').hide();
}

$(document).on("click", "#online-users li", function() {
    var id = $(this).attr('id');
    challenge(MY_UUID, MY_USERNAME, id);
    waitingView();
});

/* Utiltity */
function randomString(len) {
    return Math.random().toString(36).substring(len);
}