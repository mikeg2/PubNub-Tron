var Game = function(model, view, controller, initializer, enf) {
    this._model = model;
    this._view = view;
    this._controller = controller;
    this._ruleEnforcer = enf ? new RuleEnforcer(this._model, gameOver) : undefined;
    var _this = this;

    this._model.onReady = function() {
        _this.onReady(_this);
    }; // Won't work if model calls before onReady is set

    this.startGame = function(time) {
        console.log("TIME: ", time);
        setTimeout(function() {
            initializer(_this._model); // Rethink program structure
            _this._view.start();
            _this._controller.start();
            if(enf) {
                _this._ruleEnforcer.start();
            }
        }, time - new Date().getTime());
    };

    this._model.onGameOverUpdated = function() {
        if(_this._model.gameOver) {
            console.log("GAME OVER CALLED");
            gameOver();
        }
    };

    function gameOver() {
        _this._model.gameOver = true;
        console.log("GAME OVER");
        _this._view.stop();
        _this._controller.stop();
        if(enf) {
            _this._ruleEnforcer.stop();
        }
    }
};

Game.create = function(config) {
        var model = getModel(config);
        var view = getView(model, config);
        var controller = getController(model, config);
        return new Game(model, view, controller, getInitializer(config), config.server);
};

function getModel(config) {
    serverConfig = {
        channelBase: config.channel,
        id: 'gameModel'
    };
    var model;
    if (config.server) {
        console.log("CREATING SERVER");
        model = new ServerModel(serverConfig);
    } else {
        console.log("CREATIG CLIENT");
        model = new ClientModel(serverConfig);
    }

    model.addPlayer(config.opponentId); // TODO: Move to encapsulate
    model.addPlayer(config.myId, true);

    return model;
}

function getView(model, config) {
    return new GameView(model, config);
}

function getController(model, config) {
    var player = model.me;
    return new GameController(player, config);
}

/* initializer */
GAME_DIMENSIONS = {
    width: 800,
    height: 500
};

START_POSITIONS = [
    {
        loc: {x: GAME_DIMENSIONS.width * 0.3 , y: GAME_DIMENSIONS.height / 2},
        dir: 'r',
    },
    {
        loc: {x: GAME_DIMENSIONS.width * 0.7, y: GAME_DIMENSIONS.height / 2},
        dir: 'l',
    }
];

PLAYER_COLORS = [
    '#0095d8',
    '#f76d2f'
];

PLAYER_THICKNESS = 5;


function getInitializer(config) {
    return config.server ? initializer : function(a, b) {};
}

function initializer(model, startTime) {
    model.gameWidth = GAME_DIMENSIONS.width;
    model.gameHeight = GAME_DIMENSIONS.height;
    for (var i = model.players.length - 1; i >= 0; i--) {
        var player = model.players[i];
        player.eventList.addEvent({
            loc: START_POSITIONS[i].loc,
            dir: START_POSITIONS[i].dir,
            time: startTime
        });
        player.color = PLAYER_COLORS[i];
        player.thickness = PLAYER_THICKNESS;
    }
}

/* Rules Enforcer */

//TODO: Cache this somehow
function RuleEnforcer(model, gameOver) {
    this._model = model;
    this.start = function() {
        this.loop = setInterval(function() {
            if (isCollision(model) || areOverBounds(model)) {
                gameOver();
            }
        }, 100);
    };
    this.stop = function() {
        clearInterval(this.loop);
    };
}

function isCollision(model) {
    return isIntersectionFromEvents(model.players[0], model.players[1]);
}

function isIntersectionFromEvents(player1, player2) {
    var lines1 = getLinesFromEvents(player1.eventList.getEvents());
    lines1.thickness = player1.thickness;
    var lines2 = getLinesFromEvents(player2.eventList.getEvents());
    lines2.thickness = player2.thickness;
    return areThickLinesIntersecting(lines1, lines2); //|| areThickLinesIntersecting(lines1, lines1) || areThickLinesIntersecting(lines2, lines2);
}

function areThickLinesIntersecting(lines1, lines2) {
    console.log("ARE LINES INTERESTING");
    for (var i = lines1.length - 1; i >= 0; i--) {
        var l1 = lines1[i];
        l1.thickness = l1.thickness || lines1.thickness;
        for (var j = lines2.length - 1; j >= 0; j--) {
            var l2 = lines2[j];
            l2.thickness = l2.thickness || lines2.thickness;
            if (areThickIntersecting(l1, l2)) {
                return true;
            }
        }
    }
    console.log("RETURN FALSE");
    return false;
}

function areThickIntersecting(line1, line2) {
    var rect1 = convertThickLineToRect(line1);
    var rect2 = convertThickLineToRect(line2);
    console.log("RECT1: ", rect1, " RECT2: ", rect2);
    return areRectsOverlapping(rect1, rect2);
}

function convertThickLineToRect(line) {
    if(isVirtical(line)) {
        var x = line.start.x;
        return {
            left: x - 0.5 * line.thickness,
            right: x + 0.5 * line.thickness,
            top: line.start.y < line.end.y ? line.start.y : line.end.y,
            bottom: line.start.y > line.end.y ? line.start.y : line.end.y
        };
    } else {
        var y = line.start.y;
        console.log("thickness", line.thickness);
        return {
            top: y - 0.5 * line.thickness,
            bottom: y + 0.5 * line.thickness,
            left: line.start.x < line.end.x ? line.start.x : line.end.x,
            right: line.start.x > line.end.x ? line.start.x : line.end.x
        };
    }
}

function isVirtical(line) {
    return line.end.x == line.start.x;
}

function areRectsOverlapping(a, b) {
  return (a.left <= b.right &&
          b.left <= a.right &&
          a.top <= b.bottom &&
          b.top <= a.bottom);
}

function areOverBounds(model) {
    var bounds = {
        width: model.gameWidth,
        height: model.gameHeight
    };
    for (var i = model.players.length - 1; i >= 0; i--) {
        var player = model.players[i];
        if(isOverBounds(player, bounds)) {
            return true;
        }
    }
    return false;
}

// Does not take into account thickness
function isOverBounds(player, bounds) {
    var loc = finalLocationFromEvents(player.eventList.getEvents());
    if (loc.x < 0 || loc.x > bounds.width || loc.y < 0 || loc.y > bounds.height) {
        return true;
    }
    return false;
}