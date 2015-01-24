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
    }
}

/* Rules Enforcer */

//TODO: Cache this somehow
function RuleEnforcer(model, view, gameOver) {
    this._model = model;
    this.start = function() {
        this.loop = setInterval(function() {
            if (false) {
                gameOver();
            }
        }, 30);
    };
    this.stop = function() {
        clearInterval(this.loop);
    };
}

function isCollision(model) {
    return isIntersectionFromEvents(model.players[0].eventList.getEvents(), model.players[1].eventList.getEvents());
}

function isIntersectionFromEvents(events1, events2) {
    var lines1 = getLinesFromEvents(events1);
    var lines2 = getLinesFromEvents(events2);
    return areLinesIntersecting(lines1, lines2) || areLinesIntersecting(lines1, lines1) || areLinesIntersecting(lines2, lines2);
}

function areLinesIntersecting(lines1, lines2) {
    if(lines1 == lines2) {
        console.log("SAME LINE: ");
    }
    for (var i = lines1.length - 1; i >= 0; i--) {
        var l1 = lines1[i];
        for (var j = lines2.length - 1; i >= 0; i--) {
            var l2 = lines2[j];
            if (areIntersecting(l1, l2) || areCollinearIntersect(l1, l2)) {
                return true;
            }
        }
    }
    console.log("RETURN FALSE");
    return false;
}

function areIntersecting(line1, line2) {
    console.log("L1: ", JSON.stringify(line1), " L2: ", line2);
    var p1 = line1.start;
    var p2 = line1.end;
    var p3 = line2.start;
    var p4 = line2.end;
    return lineIntersect(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y);
}

function lineIntersect(x1,y1,x2,y2, x3,y3,x4,y4) {
    var x=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    var y=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    if (isNaN(x)||isNaN(y)) {
        return false;
    } else {
        if (x1>=x2) {
            if (!(x2<=x&&x<=x1)) {return false;}
        } else {
            if (!(x1<=x&&x<=x2)) {return false;}
        }
        if (y1>=y2) {
            if (!(y2<=y&&y<=y1)) {return false;}
        } else {
            if (!(y1<=y&&y<=y2)) {return false;}
        }
        if (x3>=x4) {
            if (!(x4<=x&&x<=x3)) {return false;}
        } else {
            if (!(x3<=x&&x<=x4)) {return false;}
        }
        if (y3>=y4) {
            if (!(y4<=y&&y<=y3)) {return false;}
        } else {
            if (!(y3<=y&&y<=y4)) {return false;}
        }
    }
    return true;
}

function areCollinearIntersection(line1, line2) {
    return areCollinear(line1, line2) && line1.start < line2.end;
}

function areCollinear(line1, line2) {
    var points = [line1.start, line1.end, line2.start, line2.end];
    var xCo = linXcoefficient(points[0], points[1]);
    var constCo = linConstant(points[0], points[1]);
    for (var i = points.length - 2; i >= 1; i--) {
        var iterXco = linXcoefficient(points[i], points[i+1]);
        var iterConstCo = linConstant(points[i], points[i+1]);
        if(iterXco != xCo || iterConstCo != constCo) {
            return false;
        }
    }
    return true;
}

// could be NaN, but that should not cause problems, right?
function linXcoefficient(p1, p2) {
    return (p1.y - p2.y)/(p1.x - p2.x);
}

function linConstant(p1, p2) {
    return linXcoefficient(p1, p2) * p1.x + p1.y;
}
