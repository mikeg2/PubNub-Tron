//Global Variables / Exports
var GameSyncModel;

(function models() {
    // ---Models---
    MODEL_PROPERTIES = ['gameState'];

    GameSyncModel = function(channel, me) {
        var playerOpt = {
            channel: channel
        };
        this.players = [];
        this.addPlayer = function(id) {
            var player = new Player(id, playerOpt);
            this.players.push(player);
            return player;
        };
        this.me = this.addPlayer(me);

        this.id = "model"; // Objects with same ID are synced with PubNub
        defineModelProperties(this, MODEL_PROPERTIES, {
            channel: channel,
        });

        this.events = [];
        this.gameOver = false;
    };

    function Player(id, opt) {
        this.id = id;
        defineModelProperties(this, ['points', 'position'], opt);

        /*
        EVENT TYPES:
            BASIC STRUCTURE: {
                loc: ,
                time: ,
                type: ,
            }
            TYPES:
                Move { dir: l, r, u, d }
                

            
         */
        defineModelArray(this, 'events', {
            channel: channel,
            addName: 'addEvent',
            removeName: 'removeEvent',
            onAdd: safeCb(this, 'onEventAdded'),
            onRemove: safeCb(this, 'onEventRemoved')
        });
    }

    // ---Model Creation Helpers---
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

    // TODO: Make sure this is reliable even if a single message is missed...
    // - Right now, just sends entire array
    function defineModelArray(obj, propName, opt) {
        obj[privateName(propName)] = [];
        defineAlias(obj, privateName(propName), propName);
        obj[opt.addName] = getAddFunction(obj, propName, opt);
        obj[opt.removeName] = getRemoveFunction(obj, propName, opt);
        listenForArrayChange(obj, propName, opt);
    }

    function getAddFunction(obj, propName, opt) {
        return function (toAdd) {
            obj[privateName(propName)].push(toAdd);
            opt.onAdd();
            console.log("ADDING: ", toAdd);
            pubnub.publish({ // TODO: Refactor and remove duplication
                channel: opt.channel,
                message: {
                    type: 'arrayValAdd',
                    objId: obj.id,
                    prop: propName,
                    val: obj[privateName(propName)] // ineffiecient, but reliable
                }
            });
        };
    }

    function getRemoveFunction(obj, propName, opt) {
        return function (toRemove) {
            obj[privateName(propName)].remove(toRemove);
            opt.onRemove();
            pubnub.publish({
                channel: opt.channel,
                message: {
                    type: 'arrayValRemove',
                    objId: obj.id,
                    prop: propName,
                    val: obj[privateName(propName)] // ineffiecient, but reliable
                }
            });
        };
    }

    function listenForArrayChange(obj, propName, opt) {
        console.log("LISTEN FOR ARRAY: ", propName, " ON: ", opt);
        getChannel(opt.channel).listen(
            function(message, env, channel) {
                console.log("ARRAY OBJ: ", obj, " HEARD: ", message, " ON: ", channel, " WITH: ", opt);
                if ((message['type'] == "arrayValRemove" || message['type'] == "arrayValAdd") &&
                        message['objId'] == obj.id &&
                        message['prop'] == propName) {
                    obj[privateName(propName)] = message.val;
                    console.log("onAdd CB: ", opt.onAdd);
                    if (message['type'] == "arrayValAdd") {
                        opt.onAdd(message.val);
                    } else {
                        opt.onRemove(message.val);
                    }
                }
            }
        );
    }


    // By using a private name, setter/getter don't go off when value changes
    function privateName(propName) {
        return "_" + propName;
    }

    // ---Utility---
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

    function defineAlias(obj, prop, alias) {
        Object.defineProperty(obj, alias, {
            get: function() {
                return obj[prop];
            },
            set: function(val) {
                obj[prop] = val;
            }
        });
    }
})();