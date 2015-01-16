var ClientModel;
var ServerModel;

(function() {
    /*
    Callbacks: onUpdateFromServer, onChange

    Program Flow:
        1) API calls 'addEvent'
        2) Model adds temp event, sends request for true event
        3) View updates based on temp event
        4) Model recieves true event, updates events
        5) View refreshes
     */
    ClientEventList = function(id, conf) {
        this.id = id;
        this._conf = conf;

        (function listenForNewEvents() {
            this._pubnub.subscribe({
                channel: this._conf.channel,
                message: function(msg, env, chnl) {
                    if (msg.evnt) {
                        this.handleEvent(msg.event);
                    }
                }
            });
        })();
    };
    ClientEventList.prototype = {

        addEvent: function (anEvent, req) {
            addTimeToEvent(anEvent);
            var tempDrctEvent = registerTempEvent(anEvent);
            req.id = tempDrctEvent.id; // Will be used later to identify which event to remove when "true" event is returned
            sendEventRequest(req);
        },

        registerTempEvent: function(anEvent) {
            anEvent.id = createId(10);
            anEvent.temp = true;
            addEventObj(anEvent);
            return anEvent;
        },

        handleEvent: function(anEvent) {
            removeTempEvent(anEvent.respTo);
            addEventObj(anEvent);
        },

        addEventObj: function(anEvent) {
            this.events.push(anEvent);
            safeCb(this, 'onChange')(anEvent);
        },

        removeTempEvent: function(tempEventId) {
            this.events = this._events.filter(function(e) {
                return !(e.temp && e.id == tempEventId);
            });
        },

        sendEventRequest: function(evntReq) {
            eventReq.listId = this.id;
            this._pubnub.broadcast({
                channel: this._conf.channel,
                message: {
                    req: evntReq
                }
            });
        }
    };

    ServerEventList = function(reqToEvent) {

        (function listenForEventRequests() {
            this._pubnub.subscribe({
                channel: this._conf.channel,
                message: function(msg, env, chnl) {
                    if(msg.req){
                        handleEventRequest(msg.req);
                    }
                }
            });

            function handleEventRequest(req) {
                var newEvent = reqToEvent[req.type](req);
                newEvent.respTo = req.id;
                broadcastEvent(newEvent);
            }
        })();

    };
    ServerEventList.prototype = {

        addEvent: function(anEvent) {
            addTimeToEvent(anEvent);
            broadcastEvent(anEvent);
            addEventObj(anEvent);
        },

        broadcastEvent: function(anEvent) {
            this._pubnub.broadcast({
                evnt: anEvent
            });
        },

        addEventObj: function(anEvent) {
            this.events.push(anEvent);
            safeCb(this, 'onChange')(anEvent);
        },

    };

    /* Common */
    function createDirectionEvent(drct) {
        return {
            time: new Date().getMilliseconds(),
            drct: drct,
            type: 'event',
        };
    }

    function addTimeToEvent(anEvent) {
        anEvent.time = anEvent.time || new Date().getMilliseconds();
    }

})();

function createId(length) {
    return '_' + Math.random().toString(36).substr(2, length);
}

function safeCb(object, fnctName) {
    console.log("FNCT NAME: ", fnctName);
    return function(a) {
        console.log("SAFE CALLBACK: ", a, " ON: ", object);
        var fnct = object[fnctName];
        console.log("^CALLING: ", fnct, " WITH: ", fnctName, " ON: ", object);
        if (fnct) {
            fnct(a);
        }
    };
}