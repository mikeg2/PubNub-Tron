var ClientEventList;
var ServerEventList;

var ClientModel;
var ServerModel;

//TODO: Add history retreval for EventList. Maybe try to find better solution?
(function() {
    /*------Model------*/
    AbstractModel = function(config) {
        this.players = [];
        this.id = config.id;
        var _this = this;

        defineModelProperties(this,
            ['gameOver', 'startTime', 'gameWidth', 'gameHeight'], {
                channel: config.channelBase
            });
        this.gameOver = false;

        setupCallback(this, 'onPlayerChange');
        // getChannel(config.channelBase).listen(
        //     function(message, env, channel) {
        //         if (message.ready && message.id == _this.id) {  // Assumes only one other model
        //             this.numReady = this.numReady ? this.numReady+1 : 1;
        //             if (this.numReady > config.expectedModels || 1) {
        //                 _this.onReady ? _this.onReady() : undefined;
        //             }
        //         }
        //     }
        // );
    };

    ServerModel = function(config) {
        var _this = this;
        AbstractModel.call(this, config);
        this.addPlayer = function(player, isMe) { // TODO: Remove duplication
            var newPlayer = new ServerPlayer(player, config.channelBase);
            newPlayer.onChange(_this.callOnPlayerChange);
            if (isMe) {
                this.me = newPlayer;
            }
            _this.players.push(newPlayer);
        };
    };

    ClientModel = function(config) {
        var _this = this;
        console.log("CONFIG", config);
        AbstractModel.call(this, config);
        this.addPlayer = function(player, isMe) {
            var newPlayer = new ClientPlayer(player, config.channelBase); // TODO: Remove duplication
            newPlayer.onChange(_this.callOnPlayerChange);
            if (isMe) {
                this.me = newPlayer;
            }
            _this.players.push(
                    new ClientPlayer(player, config.channelBase)
                );
        };
    };

    /*------Client Properties-----*/
    var AbstractPlayer = function(channel) {
        defineModelProperties(this,
            ['color', 'thickness'], {
                channel: channel
            });
    };

    var ClientPlayer = function(id, channel) {
        AbstractPlayer.call(this, channel);
        this.id = id;
        this.eventList = new ClientEventList({
            id: id + 'eventList',
            channelBase: channel
        });

        setupCallback(this, 'onChange');
        this.eventList.onChange(this.callOnChange);
    };

    var ServerPlayer = function(id, channel) {
        AbstractPlayer.call(this, channel);
        this.id = id;
        this.eventList = new ServerEventList({
            id: id + 'eventList',
            channelBase: channel
        });

        setupCallback(this, 'onChange');
        this.eventList.onChange(this.callOnChange);
    };

    /*------Model Helpers------*/
    function setupCallback(obj, cbName) {
        var cbs = []; // TODO: attach to something
        obj[cbName] = function(cb) {
            cbs.push(cb);
        };
        obj["call" + capitalize(cbName)] = function() {
            console.log("CALL CB: ", cbs);
            for (var i = cbs.length - 1; i >= 0; i--) {
                cbs[i]();
            }
        };
        obj["remove" + capitalize(cbName)] = function(toRemove) {
            cbs = cbs.filter(function(obj) {
                return obj != toRemove;
            });
        };
    }

    /*------Model Properties-----*/
    function defineModelProperties(obj, propNames, opt) {
        var getOnSet = opt.getOnSet || defaultGetOnSet;
        for (var i = propNames.length - 1; i >= 0; i--) {
            var name = propNames[i];
            var newOpt = $.extend(true, {}, opt);
            console.log("NEW OPT: ", newOpt);
            newOpt.onUpdate = getOnSet(obj, name);
            defineModelProperty(obj, name, newOpt);
        }
    }

    function defaultGetOnSet (obj, propName) {
        var cbName = 'on' + capitalize(propName) + "Updated";
        console.log("DEFAULT GET ON SET: ", cbName);
        return safeCb(obj, cbName);
    }

    function capitalize(s) {
        return s[0].toUpperCase() + s.slice(1);
    }

    function defineModelProperty(obj, propName, opt) {
        console.log("DEFINING: ", propName, " OF: ", obj, " WITH: ", opt);
        Object.defineProperty(obj, propName, {
            get: function(val) {
                return this[privateName(propName)];
            },
            set: function(val) {
                console.log("OBJECT: ", obj, "SETTING: ", propName, " TO: ", val);
                if(this[privateName(propName)] === val) {
                    return;
                }
                opt.onUpdate(val);
                this[privateName(propName)] = val;
                if (opt.broadcast !== false) {
                    broadcastObjectValue(
                        obj, propName, opt);
                }
            }
        });
        if(opt.listen !== false) {
            console.log("LISTENING WITH: ", obj, " FOR: ", propName);
            listenForObjectValue(
                obj, propName, opt);
        }
    }

    function broadcastObjectValue(obj, propName, opt) {
        pubnub.publish({
            channel: opt.channel,
            message: {
                type: 'propVal',
                objId: obj.id,
                prop: propName,
                val: obj[privateName(propName)]
            }
        });
    }

    function listenForObjectValue(obj, propName, opt) {
        getChannel(opt.channel).listen(
            function(message, env, channel) {
                console.log("OBJ: ", obj, " HEARD: ", message, " ON: ", channel, " WITH: ", opt);
                console.log("^ FOR PROP: ", propName);
                if (message['type'] == "propVal" &&
                        message['objId'] == obj.id &&
                        message['prop'] == propName) {
                    console.log("^SYNCING: ", obj);
                    obj[privateName(propName)] = message.val;
                    opt.onUpdate(message.val);
                    console.log("FINISH ON SET");
                }
            }
        );
    }

    /*------Event List------*/
    var AbstractEventList = function(conf) {
        this.id = conf.id;
        this._conf = conf;
        this._events = [];
        this._channel = this._conf.channelBase + "-" + this._conf.id;

        //this.loadHistory();

        setupCallback(this, 'onChange');
    };
    AbstractEventList.prototype = {

        addEventObj: function(anEvent) {
            this._events.push(anEvent);
            this.callOnChange();
        },

        getEvents: function() {
            return this._events; // TODO: Make a copy before returning
        },

        loadHistory: function() {
            var _this = this;
            pubnub.history({
                channel: this._channel,
                reverse: true,
                callback: function(history) {
                    console.log("LOAD HIST: ", history);
                    for (var i = history[0].length - 1; i >= 0; i--) {
                        var hisMsg = history.history[0][i];
                        _this.addEventObject(hisMsg);
                    }
                }
            });
        }

    };

    ClientEventList = function(conf) {
        AbstractEventList.call(this, conf);
        var _this = this;

        (function listenForNewEvents() {
             getChannel(_this._channel).listen(
                function(msg, env, chnl) {
                    console.log("MSG: ", msg);
                    if (msg.evnt) {
                        _this.handleEvent(msg.evnt);
                    }
                }
            );
            console.log("CLIENT LISTENING ON: ", _this._channel);
        })();
    };
    var cProto = ClientEventList.prototype = Object.create(AbstractEventList.prototype);
    cProto.addEvent = function (anEvent, req) {
        addTimeToEvent(anEvent);
        var tempDrctEvent = this.registerTempEvent(anEvent);
        req = req || $.extend({}, tempDrctEvent, {temp: false});
        req.id = tempDrctEvent.id; // Will be used later to identify which event to remove when "true" event is returned
        this.sendEventRequest(req);
    };
    cProto.registerTempEvent = function (anEvent) {
        anEvent.id = createId(10);
        anEvent.temp = true;
        this.addEventObj(anEvent);
        return anEvent;
    };
    cProto.handleEvent = function (anEvent) {
        this.removeTempEvent(anEvent.respTo);
        this.addEventObj(anEvent);
    };
    cProto.removeTempEvent = function (tempEventId) {
        this._events = this._events.filter(function(e) {
            return !(e.temp && e.id == tempEventId);
        });
    };
    cProto.sendEventRequest = function (evntReq) {
        pubnub.publish({
            channel: this._channel,
            message: {
                req: evntReq,
                listId: this.id
            }
        });
        console.log("EVENT REQ SENT: ", evntReq, " ON: ", this._channel);
    };

    ServerEventList = function(conf) {
        AbstractEventList.call(this, conf);
        var _this = this;
        var reqToEvent;

        (function reqToEventSetup() {
            /**
             * Converts request into event by updating ".time" to current "server" time.
             */
            var updateTimeReqToEvent = function (req) {
                req.time = timeSync.now(); // TODO: Should duplicate objects
                return req;
            };

            reqToEvent = conf.reqToEvent || updateTimeReqToEvent;
            console.log("REQ TO EVENT: ", updateTimeReqToEvent);
        })();

        (function listenForEventRequests() {
            console.log("SERVER LISTENING: ", _this._channel);
             getChannel(_this._channel).listen(
                function(msg, env, chnl) {
                    console.log("MSG SERVER", _this.id ," RECIEVED: ", msg);
                    if (msg.listId !== _this.id) {
                        return;
                    }
                    if(msg.req){
                        console.log("^handle event request");
                        handleEventRequest(msg.req);
                    }
                }
            );

            function handleEventRequest(req) {
                var newEvent = reqToEvent(req);
                newEvent.respTo = req.id;
                newEvent.id = createId(9);
                console.log("NEW EVENT: ", newEvent);
                _this.broadcastEvent(newEvent);
                _this.addEventObj(newEvent);
            }
        })();

    };
    var sProto = ServerEventList.prototype = Object.create(AbstractEventList.prototype);
    sProto.addEvent = function(anEvent) {
        addTimeToEvent(anEvent);
        this.broadcastEvent(anEvent);
        this.addEventObj(anEvent);
    };
    sProto.broadcastEvent = function(anEvent) {
        var _this = this;
        pubnub.publish({
            channel: _this._channel,
            message: {
                evnt: anEvent,
                listId: _this.id
            }
        });
        console.log("SERVER PUBLISHED: ", anEvent, " ON: ", _this._channel);
    };

    /* Common */
    function createDirectionEvent(drct) {
        return {
            drct: drct,
            type: 'event',
        };
    }

    function addTimeToEvent(anEvent) {
        anEvent.time = anEvent.time || timeSync.now();
    }

})();

function privateName(name) {
    return '_' + name;
}

function createId(length) {
    return Math.random().toString(36).substr(2, length);
}

function safeCb(object, fnctName) {
    return function(a) {
        var fnct = object[fnctName];
        if (fnct) {
            fnct(a);
        }
    };
}