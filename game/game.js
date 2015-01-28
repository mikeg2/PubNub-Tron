var Game = function(model, view, controller, initializer, enf) {
    this._model = model;
    this._view = view;
    this._controller = controller;
    this._ruleEnforcer = enf ? new RuleEnforcer(this._model, gameOver) : undefined;
    var _this = this;

    this._model.onReady = function() {
        _this.onReady(_this);
    }; // Won't work if model calls before onReady is set

    this.startGame = function() {
        if (_this.started) {
            return;
        }
        _this.started = true;
        initializer(_this._model); // Rethink program structure
        _this._view.start();
        _this._controller.start();
        if(enf) {
            _this._ruleEnforcer.start();
        }
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
        _this.started = false;
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
    var _this = this;
    this._lineModel = model;
    this.start = function() {
        var linesCompleted = {};
        var opt = {
            cacheGive: 100,
            linesCompleted: linesCompleted,
            blacklist: linesCompleted
        };
        _this.loop = setInterval(function() {
            if (isCollision(model, opt) || areOverBounds(model)) {
                gameOver();
            }
        }, 200);
    };
    this.stop = function() {
        clearInterval(_this.loop);
    };
}

function isCollision(model, opt) {
    return isIntersectionFromEvents(model.players[0], model.players[1], opt);
}

function isIntersectionFromEvents(player1, player2, opt) {
    var selfOpt = $.extend({
        fudge: Math.pow(player1.thickness / 2, 2), // Awkword and imperfict solution to overlapping on turns
        skipDuplicates: true
    }, opt);
    var lines1 = getCacheLinesFromEvents(player1.eventList.getEvents(), player1.id, opt.cacheGive || 0);
    lines1.thickness = player1.thickness;
    var lines2 = getCacheLinesFromEvents(player2.eventList.getEvents(), player2.id, opt.cacheGive || 0);
    lines2.thickness = player2.thickness;
    return areThickLinesIntersecting(lines1, lines2, opt) || areThickLinesIntersecting(lines1, lines1, selfOpt) || areThickLinesIntersecting(lines2, lines2, selfOpt);
}

function areThickLinesIntersecting(lines1, lines2, opt) {
    opt = opt || {};
    console.log("ARE LINES INTERESTING: ", opt);
    for (var i = lines1.length - 1; i >= 0; i--) {
        if (opt.blacklist && opt.blacklist[lines1[i].id]) {
            console.log("BLACKLISTED");
            return;
        } else if(opt.linesCompleted) {
            opt.linesCompleted[lines1[i].id] = true;
        }
        var l1 = lines1[i];
        l1.thickness = l1.thickness || lines1.thickness;
        for (var j = lines2.length - 1; j >= 0; j--) {
            var l2 = lines2[j];
            if (opt.skipDuplicates && l1 === l2) {
                console.log("SKIP DUPLICATES");
                continue;
            }
            console.log("NOT DUPLICATES: ", l1, " ", l2);
            l2.thickness = l2.thickness || lines2.thickness;
            if (areThickIntersecting(l1, l2, opt.fudge)) {
                return true;
            }
        }
    }
    console.log("RETURN FALSE");
    return false;
}

function areThickIntersecting(line1, line2, fudge) {
    var rect1 = convertThickLineToRect(line1);
    var rect2 = convertThickLineToRect(line2);
    console.log("RECT1: ", rect1, " RECT2: ", rect2);
    console.log("FUDGE: ", fudge);
    return areRectsOverlapping(rect1, rect2) &&
        (!fudge || calcOverlappingArea(rect1, rect2) > fudge);
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
  return (a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom &&
          b.top < a.bottom);
}

function calcOverlappingArea(a, b) {
    x_overlap = Math.max(0, Math.min(a.right,b.right) - Math.max(a.left,b.left));
    y_overlap = Math.max(0, Math.min(a.bottom,b.bottom) - Math.max(a.top,b.top));
    overlapArea = x_overlap * y_overlap;
    return overlapArea;
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

/* Game Starter: Make sure games started in right order */

function waitForClientsReady(clients, channel, cb) {
    var waitingInterval = setInterval(function() {
        clientsAreReady(clients, channel, function(areReady) {
            console.log("ARE READY: ", areReady);
            if (areReady) {
                console.log("ARE READY!");
                cb();
                clearInterval(waitingInterval);
            }
        });
    }, 150);
}

// TODO: Redo this with presence api instead
function clientsAreReady(clients, channel, cb) {
    async.map(clients, function(clientId, iterCb) {
        pubnub.state({
            channel: channel,
            uuid: clientId,
            callback: function(m) {
                console.log("ARE READY ITER: ", m.isReady, " ON: ", channel);
                var isReady = m.isReady;
                iterCb(undefined, isReady);
            }
        });
    }, function(err, areReady) {
        console.log("ARE READY ARRAY: ", areReady);
        if (err) {
            alert("ERROR!");
            stop();
        }
        for (var i = areReady.length - 1; i >= 0; i--) {
            if(!areReady[i])
                return cb(false);
        }
        return cb(true);
    });
}

function clientIsReady(channel, clientId) {
    console.log("CLIENT IS READY");
    pubnub.state({
        channel: channel,
        uuid: clientId,
        callback: function(state) {
            state.isReady = true;
            pubnub.state({
                channel: channel,
                uuid: clientId,
                state: state,
                callback: function(m) {
                    console.log("START CB: " + JSON.stringify(m) + " ON: ", channel);
                },
                error: function() {
                    alert("ERROR!");
                }
            });
        }
    });
}








