/* Model Events */

function convertEventsToLineSegments(eventsSorted, startingState) {
    startingState = startingState || {};
    // eventsSorted = getMovementEvents / filter <-- Use if add additional event types
    for (var i = eventsSorted.length - 1; i >= 0; i--) {
        var startingEvent = eventsSorted[i];
        var endingEvent = eventsSorted[i];
    }
}

function getFinalLocation(eventsSorted, startingState) {

}

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
    var lastLocation; // FIXME: This should come from somwhere else
    for (var i = 0; i < events.length - 1; i++) {
        if (!lastLocation && events[i].loc) {
            lastLocation = events[i].loc;
        }
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
    lastLocation = lastLocation || lastEvent.loc;
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