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

            console.log("RUNNING VIEW LOOP");
            _this.loop = setInterval(function() {
                _this.refreshView();
            }, 70);
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
            this.redrawUsers();
        },

        clearView: function() {
            this._stage.removeAllChildren();
        },

        // Adds additional lines and moves user
        refreshView: function() {
            this.refreshPlayers();
        },

        redrawUsers: function() {
            for (var i = this._players.length - 1; i >= 0; i--) {
                this._players[i].rebuildView();
            }
        },

        refreshPlayers: function() {
            for (var i = this._players.length - 1; i >= 0; i--) {
                this._players[i].refreshView();
            }
        }
    };

    PlayerView = function(model, stage) {
        this._stage = stage;
        this._model = model;
        this._cache = {};
        var _this = this;
        model.onChange(function() {
            _this.rebuildView();
        });
        this.rebuildView();
    };
    PlayerView.prototype = {

        rebuildView: function() {
            console.log("REBUILDING VIEW");
            this.redrawBackground();
            this.redrawPath();
            this.redrawIcon();
        },

        refreshView: function() {
            console.log("REFRESH VIEW");
            this.redrawIcon();
            this.updateLastLine();
        },

        redrawBackground: function() {
            var background = new createjs.Shape();
            background.graphics.beginFill('black');
            background.graphics.rect(0, 0, 10000, 10000);
            this._stage.addChildAt(background, 0);
        },

        redrawPath: function() {
            var lines = getLinesFromEvents(this._model.eventList.getEvents());
            var lineGrapics = this.drawLines(lines);
            console.log("LAST LINE MODEL", lines[lines.length - 1]);
            this._cache.lastLineModel = lines[lines.length - 1];
            this._cache.lastLineGraphic = lineGrapics[lineGrapics.length - 1];
        },

        redrawIcon: function() {
            //finalLocation = finalLocationFromEvents(this._model.eventList.getEvents());
            //drawIconAt(this._stage, finalLocation);
        },

        updateLastLine: function() {
            if (!this._cache.lastLineModel) {
                return;
            }
            var lastLineModel = updateLineTo(this._cache.lastLineModel, timeSync.now());
            this._stage.removeChild(this._cache.lastLineGraphic);
            this.drawLine(lastLineModel);
            this._stage.update();
        },

        drawLines: function(lines) {
            var allLines = [];
            for (var i = lines.length - 1; i >= 0; i--) {
                var line = lines[i];
                allLines.push(this.drawLine(line));
            }
            this._stage.update();
            return allLines;
        },

        drawLine: function(line) {
            var lineGraphic = new createjs.Shape();
            lineGraphic.graphics.setStrokeStyle(this._model.thickness);
            lineGraphic.graphics.beginStroke(this._model.color);
            lineGraphic.graphics.moveTo(line.start.x, line.start.y);
            lineGraphic.graphics.lineTo(line.end.x, line.end.y);
            lineGraphic.graphics.endStroke();
            // var roundedEnds = Implement to get ride of sharp edge
            this._stage.addChild(lineGraphic);
            return lineGraphic;
        }

    };

})();