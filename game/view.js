var GameView;

(function gameView() {
    GameView = function(model, htmlOpt) {
        this._model = model;
        console.log("HTML OPT: ", htmlOpt);
        this._canvas = document.querySelector(htmlOpt.canvas);
        this._stage = new createjs.Stage(this._canvas);

        var _this = this;
        this.start = function() {
            model.onGameWidthUpdated = function() {
                _this._canvas.width = model.gameWidth;
            };
            model.onGameWidthUpdated();

            model.onGameHeightUpdated = function() {
                _this._canvas.height = model.gameHeight;
            };
            model.onGameHeightUpdated();

            this._players = [];
            for (var i = model.players.length - 1; i >= 0; i--) {
                var player = new PlayerView(model.players[i], this._stage);
                this._players.push(player);
            }

            _this.loop = setInterval(function() {
                _this.rebuildView();
            }, 50);
        };

        this.stop = function() {
            clearInterval(_this.loop);
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
        },

        // Ideally, this function would not be in the view, but it's impractical for it not to be
        arePlayersIntersecting: function() {

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
            this.redrawBackground();
            this.redrawPath();
            this.redrawIcon();
        },

        refreshView: function() {
            this.redrawIcon();
            this.updateLines();
        },

        redrawBackground: function() {
            var background = new createjs.Shape();
            background.graphics.beginFill('black');
            background.graphics.rect(0, 0, 10000, 10000);
            this._stage.addChildAt(background, 0);
        },

        redrawPath: function() {
            lines = getLinesFromEvents(this._model.eventList.getEvents());
            this.drawLines(lines);

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
            console.log("MODEL W/ COLOR: ", this._model);
            lineGraphic.graphics.beginStroke(this._model.color);
            lineGraphic.graphics.moveTo(line.start.x, line.start.y);
            lineGraphic.graphics.lineTo(line.end.x, line.end.y);
            lineGraphic.graphics.endStroke();
            // var roundedEnds = Implement to get ride of sharp edge
            this._stage.addChild(lineGraphic);
        }

    };

})();