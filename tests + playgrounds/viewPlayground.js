(function view() {
    canvas = document.getElementById('demoCanvas');
    canvas.width = 500;
    canvas.height = 500;
    $canvas = $(canvas);

    //---Basic Stage---
    var stage = new createjs.Stage(canvas);

    var player = new createjs.Shape();
    player.graphics.beginFill("red").drawCircle(0, 0, 50);
    player.x = 0;
    player.y = 0;
    stage.addChild(player);

    stage.update();

    //---Mouse Tracker + Model---

    // TODO: Only allow values within bounds
    var lastPlayerLocation;
    onPointerMove(function(loc) {
        player.x = loc.x;
        player.y = loc.y;
        stage.update();
        lastPlayerLocation = loc;
    });
    function updateLocation() {
        pubnub.publish({
            channel: 100,
            message: lastPlayerLocation
        });
    }

    setInterval(updateLocation, 70);



    // Tracks either the mouse of touch if on 
    function onPointerMove(cb) {
        if(touchOnly()) {
            onDragging(cb); // TODO: This part is untested
        } else {
            onMouseMove(cb);
        }
    }

    function touchOnly() {
        return (navigator.userAgent.match(/iPad/i) !== null) ||
            (navigator.userAgent.match(/iPhone/i)) ||
            (navigator.userAgent.match(/iPod/i)) ||
            (navigator.userAgent.match(/Android/i));
    }

    function onDragging(cb) {
        n("pressmove", function(event) {
             cb(mouseLocation(event));
        });
    }

    function onMouseMove(cb) {
        window.onmousemove = function(event) {
             cb(mouseLocation(event));
        };
    }

    // TODO: Write this function
    function mouseLocation(event) {
        canvasOffset = $canvas.offset();
        return {
            x: event.clientX - canvasOffset.left,
            y: event.clientY - canvasOffset.top
        };
    }

    //---Mirror Canvas---
    var stageMirror = new createjs.Stage('mCanvas');

    var playerMirror = new createjs.Shape();
    playerMirror.graphics.beginFill("red").drawCircle(0, 0, 50);
    playerMirror.x = 0;
    playerMirror.y = 0;
    stageMirror.addChild(playerMirror);

    stageMirror.update();

    //---Mirror Listener
    canvas = document.getElementById('mCanvas');

    getChannel(100).listen(function(loc, env, chnl) {
        if (playerMirror.x == loc.x && playerMirror.y == loc.y) {
            return;
        }
        playerMirror.x = loc.x;
        playerMirror.y = loc.y;

        stageMirror.update();
    });

})();