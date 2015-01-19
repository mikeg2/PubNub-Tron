var ClientEventList;
var ServerEventList;

var ClientModel;
var ServerModel;
// TODO: Rewrap pubnub so not just in pubnubWrapper

(function() {
    /*------Model------*/
    AbstractModel = function(config) {
        this.players = [];
        this.id = config.id;

        defineModelProperties(this,
            ['gameStatus'], {
                channel: config.channelBase
            });
    };

    ServerModel = function(config) {
        var _this = this;
        AbstractModel.call(this, config.channelBase);
        this.addPlayer = function(player) {
            _this.players.push(
                    new ServerPlayer(player, config.channelBase)
                );
        };
    };

    ClientModel = function(config) {
        var _this = this;
        console.log("CONFIG", config);
        AbstractModel.call(this, config);
        this.addPlayer = function(player) {
            _this.players.push(
                    new ClientPlayer(player, config.channelBase)
                );
        };
    };

    /*------Client Properties-----*/
    var ClientPlayer = function(id, channel) {
        this.id = id;
        this.eventList = new ClientEventList({
            id: id + 'eventList',
            channelBase: channel
        });

        setupCallback(this, 'onChange');
        this.eventList.onChange(this.callOnChange);
    };

    var ServerPlayer = function(id, channel) {
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
            console.log(cbs);
            for (var i = cbs.length - 1; i >= 0; i--) {
                cbs[i]();
            }
        };
    }

    /*------Model Properties-----*/
    function defineModelProperties(obj, propNames, opt) {
        var getOnSet = opt.getOnSet || defaultGetOnSet;
        for (var i = propNames.length - 1; i >= 0; i--) {
            var name = propNames[i];
            var newOpt = $.extend(true, {}, opt);
            newOpt.onSet = getOnSet(obj, name);
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
            set: function(val) {
                console.log("OBJECT: ", obj, "SETTING: ", propName, " TO: ", val);
                this[privateName(propName)] = val;
                opt.onSet(val);
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
                    opt.onSet(message.val);
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

        setupCallback(this, 'onChange');
    };
    AbstractEventList.prototype = {

        addEventObj: function(anEvent) {
            this._events.push(anEvent);
            this.callOnChange();
        },

        getEvents: function() {
            return this._events; // TODO: Make a copy before returning
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

        (function reqToEventSetup() {
            /**
             * Converts request into event by updating ".time" to current "server" time.
             */
            var updateTimeReqToEvent = function (req) {
                req.time = new Date().getTime(); // TODO: Should duplicate objects
                return req;
            };

            reqToEvent = conf.reqToEvent || updateTimeReqToEvent;
            console.log("REQ TO EVENT: ", updateTimeReqToEvent);
        })();

        (function listenForEventRequests() {
            console.log("SERVER LISTENING: ", _this._channel);
             getChannel(_this._channel).listen(
                function(msg, env, chnl) {
                    console.log("MSG SERVER RECIEVED: ", msg);
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
                //listId: _this.id
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
        anEvent.time = anEvent.time || new Date().getTime();
    }

})();

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

function extend(subClass, baseClass) {
    function inheritance() { }
    inheritance.prototype = baseClass.prototype;
    subClass.prototype = new inheritance();
    subClass.prototype.constructor = subClass;
    subClass.baseConstructor = baseClass;
    subClass.superClass = baseClass.prototype;
}