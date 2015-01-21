START_POSITIONS = {
    1: [0.3, 0.3],
    2: [0.7, 0.7]
};

var Game = function(model, view, controller) {
    this._model = model;
    this._view = view;
    this._controller = controller;

    this.startGame = function() {
        this._view.start();
        this._controller.start();
    };
};

Game.create = function(config) {
        var model = getModel(config);
        var view = getView(model, config);
        var controller = getController(model, config);
        return new Game(model, view, controller);
};

function getModel(config) {
    serverConfig = {
        channelBase: config.channel,
        id: 'gameModel'
    };
    var model;
    if (config.server) {
        model = new ServerModel(serverConfig);
    } else {
        model = new ClientModel(serverConfig);
    }

    model.addPlayer(config.opponentId); // TODO: Move to encapsulate
    model.addPlayer(config.myId);

    return model;
}

function getView(model, config) {
    return new GameView(model, config);
}

function getController(model, config) {
    var player;
    for (var i = model.players.length - 1; i >= 0; i--) {
        console.log("PLAYER ID: ", model.players[i].id, " MY ID: ", config.myId);
        if(model.players[i].id == config.myId) {
            player = model.players[i];
            break;
        }
    }
    return new GameController(player, config);
}