var GameView;

(function gameView() {
    GameView = function(model) {
        this._model = model;
        
        // Link model to View
        for (var i = model.players.length - 1; i >= 0; i--) {
            var player = model.players[i];
            player.onEventAdded = rebuildView;
        }
    };

    GameView.prototype = {
        // Erases old view and build new one
        rebuildView: function() {
            redrawLines();
            redrawUsers();
        },

        // Adds additional lines and moves user
        refreshView: function() {
            updatePlayerLocations();
            updateLines(); // Only draw new ones since last turn
        }
    };



})();