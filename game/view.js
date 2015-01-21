var GameView;

(function gameView() {
    GameView = function(model, htmlOpt) {
        this._model = model;
        console.log("HTML OPT: ", htmlOpt);
        this._canvas = document.querySelector(htmlOpt.canvas);

        this._canvas.width = 500;
        this._canvas.height = 500;
        this._stage = new createjs.Stage(this._canvas);

        var _this = this;
        this.start = function() {
            this._players = [];
            for (var i = model.players.length - 1; i >= 0; i--) {
                var player = new PlayerView(model.players[i], this._stage);
                this._players.push(player);
            }

            setInterval(function() {
                _this.rebuildView();
            }, 50);
        };
    };
    GameView.prototype = {
        // Erases old view and build new one
        // TODO: rewrite with containerand clearview
        rebuildView: function() {
            this.clearView();
            //this.redrawPath();
            this.redrawUsers();
        },

        clearView: function() {
            this._stage.removeAllChildren();
        },

        // Adds additional lines and moves user
        refreshView: function() {
            this.updatePlayerLocations();
            this.updateLines(); // Only draw new ones since last turn
        },

        redrawPath: function() {
            lines = getLinesFromEvents();
        },

        redrawUsers: function() {
            for (var i = this._players.length - 1; i >= 0; i--) {
                this._players[i].rebuildView();
            }
        }
    };

    PlayerView = function(model, stage) {
        this._stage = stage;
        this._model = model;
        console.log("PLAYER MODEL: ", model);
        model.onChange = this.rebuildView;
        this.rebuildView();
    };
    PlayerView.prototype = {

        rebuildView: function() {
            this.redrawPath();
            this.redrawIcon();
        },

        refreshView: function() {
            this.redrawIcon();
            this.updateLines();
        },

        redrawPath: function() {
            console.log("MODEL NOW: ", this._model);
            lines = getLinesFromEvents(this._model.eventList.getEvents());
            this.drawLines(lines);
            console.log("LINES: ", lines);

        },

        redrawIcon: function() {
            finalLocation = finalLocationFromEvents(this._model.eventList.getEvents());
            //drawIconAt(this._stage, finalLocation);
        },

        drawLines: function(lines) {
            for (var i = lines.length - 1; i >= 0; i--) {
                var line = lines[i];
                this.drawLine(line);
            }
            this._stage.update();
        },

        drawLine: function(line) {
            var lineGraphic = new createjs.Shape();
            lineGraphic.graphics.setStrokeStyle(5);
            lineGraphic.graphics.beginStroke('black');
            lineGraphic.graphics.moveTo(line.start.x, line.start.y);
            lineGraphic.graphics.lineTo(line.end.x, line.end.y);
            lineGraphic.graphics.endStroke();
            // var roundedEnds = Implement to get ride of sharp edge
            this._stage.addChild(lineGraphic);
        }

    };

    /* Location */
    function finalLocationFromEvents(events) {
        lines = getLinesFromEvents(events); // Very ineffecient
        return lines.length > 0 ? lines[lines.length - 1].end : null;
    }

    function getLinesFromEvents(events) {
        if (events.length === 0) {
            return 0;
        }
        var lines = [];
        var lastLocation = {x: 10, y: 10}; // FIXME: This should come from somwhere else
        for (var i = 0; i < events.length - 1; i++) {
            var newLocation = calcLocation(lastLocation, {
                dir: events[i].dir,
                time: events[i+1].time - events[i].time
            });
            lines.push({
                start: lastLocation,
                end: newLocation
            });
            lastLocation = newLocation;
        }
        var lastEvent = events[events.length - 1];
        var currentLocation = calcLocation(lastLocation, {
            dir: lastEvent.dir,
            time: new Date().getTime() - lastEvent.time
        });
        lines.push({
            start: lastLocation,
            end: currentLocation
        });
        return lines;
    }

    function calcLocation(startPos, info) {
        var distance = distanceTraveled(info);
        return calcMove(startPos, info.dir, distance);
    }

    function calcMove(startPos, dir, distance) {
        var delta = calcDelta(dir, distance);
        return {
            x: startPos.x + delta.x,
            y: startPos.y + delta.y
        };
    }

    function calcDelta(dir, distance) {
        console.log("dir: ", dir, " DISTANCE: ", distance);
        if (dir == 'l') {
            return {
                x: -distance,
                y: 0
            };
        } else if (dir == 'r') {
            return {
                x: distance,
                y: 0
            };
        } else if (dir == 'u') {
            return {
                x: 0,
                y: -distance
            };
        } else if (dir == 'd') {
            return {
                x: 0,
                y: distance
            };
        }
        return {
            x: -1,
            y: -1,
        };
    }

    function distanceTraveled(info) {
        return info.time * 0.05; //CONFIG.PLAYER_SPEED || 5;
    }


})();