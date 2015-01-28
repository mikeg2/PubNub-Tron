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

/* Line Model Wrapper */
// var ModelLineWrapper = function(model) {
//     this._model = model;
//     this._players = {};
//     var _this = this;

//     model.onPlayerChange(rebuildPlayerLines);
//     function rebuildPlayerLines() {
//         for (var i = model.players.length - 1; i >= 0; i--) {
//             var player = model.players[i];
//             _this._players[player.id] = getLinesFromEvents(player.eventList.getEvents());
//         }
//     }

//     function getPlayerRefreshedLinesTo(playerId, time) {
//         var playerLines = _this._players[player.id];
//         var lastLine = playerLines[playerLines.length - 1];
//         var updatedLastLine = updateLineTo(lastLine, time);
//         playerLines[playerLines.length - 1] = updatedLastLine;
//         return playerLines;
//     }

//     function getRefreshedLinesTo(time) {
//         var allLines = [];
//         for
//     }
// };

/* Cached Location */

var LOCATION_CACHE = {};

function getCacheLinesFromEvents(events, id, withinMilli) {
    return getCachedLinesFromEventsWithin(id, withinMilli) || getCachableLinesFromEvents(events, id);
}

function getCachedLinesFromEventsWithin(id, milliseconds) {
    var after = timeSync.now() - milliseconds;
    return getCachedLinesFromEventsAfter(after);
}

function getCachedLinesFromEventsAfter(id, time) {
    if (LOCATION_CACHE[id] && LOCATION_CACHE[id].time >= time) {
        return LOCATION_CACHE[id].lines;
    }
    return undefined;
}

function getCachableLinesFromEvents(events, id) {
    var lines = getLinesFromEvents(events);
    LOCATION_CACHE[id] = LOCATION_CACHE[id] || [];
    LOCATION_CACHE[id] = {
        lines: lines,
        id: id,
        time: timeSync.now()
    };
    return lines;
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
        var timeDelta = events[i+1].time - events[i].time;
        var line = getLineFromStartEvent(events[i], lastLocation, timeDelta);
        lines.push(line);
        lastLocation = line.end;
    } // TODO: Remove code duplication
    var lastEvent = events[events.length - 1];
    lastLocation = lastLocation || lastEvent.loc;
    var timeSince = timeSync.now() - lastEvent.time;
    var lastLine = getLineFromStartEvent(lastEvent, lastLocation, timeSince);
    lines.push(lastLine);
    return lines;
}

function getLineFromStartEvent(startEvent, lastLocation, timeDelta) {
    var newLocation = calcLocation(lastLocation, {
        dir: startEvent.dir,
        time: timeDelta
    });
    return {
        start: lastLocation,
        end: newLocation,
        id: startEvent.id + "-" + timeDelta + "-line",
        startEvent: startEvent
    };
}

function updateLineTo(lastLine, now) {
    return {
        start: lastLine.start,
        end: calcLocation(lastLine.start, {
            dir: lastLine.startEvent.dir,
            time: now - lastLine.startEvent.time
        }),
        startEvent: lastLine.startEvent
    };
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
    return info.time * 0.08; //CONFIG.PLAYER_SPEED || 5;
}