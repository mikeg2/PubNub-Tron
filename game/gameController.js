var GameController;

(function() {
    GameController = function(player, config) {
        var _this = this;
        this._me = player;
        this.changeDirection = function(dir) {
            _this._me.eventList.addEvent({
                dir: dir
            });
        };

        this.start = function () {
            $(document).keydown(function(e) {
                console.log("KEY DONW: ", e);
                switch(e.which) {
                    case 37: // left
                    _this.changeDirection('l');
                    break;

                    case 38: // up
                    _this.changeDirection('u');
                    break;

                    case 39: // right
                    _this.changeDirection('r');
                    break;

                    case 40: // down
                    _this.changeDirection('d');
                    break;

                    default: return; // exit this handler for other keys
                }
                e.preventDefault(); // prevent the default action (scroll / move caret)
            });
        };
    };
})();