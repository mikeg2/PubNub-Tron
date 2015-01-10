//Global Variables / Exports
var PrimaryModel;
var SecondaryModel;

(function model() {
    pubnub = PUBNUB.init({
        publish_key: 'demo',
        subscribe_key: 'demo'
    });

    function Player(opt) {
        this.id = opt.objId;
        defineModelProperties(this, ['points', 'location'], opt);
    }

    // ---Models---
    PrimaryModel = function(channel) {
        var playerOpt = {
            channel: channel
        };
        this.playerMe = new Player(playerOpt);
        this.playerOther = new Player(playerOpt);

        this.id = "model"; // Objects with same ID are synced with PubNub
        defineModelProperties(this, ['gameState'], {
            channel: channel,
            listen: false
        });

        defineModelArray(this, 'coins', {
            channel: channel,
            addName: 'addCoin',
            removeName: 'removeCoin',
            onAdd: safeCb(this, 'onCoinAdded'),
            onRemove: safeCb(this, 'onCoinRemoved'),
            listen: false
        });

        this.coins = [];
        this.gameOver = false;
    };

    // Make sure this side is always listening first.
    // TODO: Find out if you can guarentee message recieved!
    SecondaryModel = function(channel) {
        var opt = {
            channel: channel
        };
        this.playerMe = new Player(opt);
        this.playerOther = new Player(opt);

        this.id = "model";
        defineModelProperties(this, ['gameState'], {
            channel: channel,
            broadcast: false
        });

        defineModelArray(this, 'coins', {
            channel: channel,
            addName: 'addCoin',
            removeName: 'removeCoin',
            onAdd: safeCb(this, 'onCoinAdded'),
            onRemove: safeCb(this, 'onCoinRemoved'),
            broadcast: false
        });
    };

    // ---Model Creation Helpers---
    function defineModelProperties(obj, propNames, opt) {
        var getOnSet = opt.getOnSet || defaultGetOnSet;
        for (var i = propNames.length - 1; i >= 0; i--) {
            var name = propNames[i];
            opt.onSet = getOnSet(obj, name);
            defineModelProperty(obj, name, opt);
        }
    }

    function defaultGetOnSet (obj, propName) {
        cbName = 'on' + capitalize(propName) + "Updated";
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
                this[getPrivateNameOf(propName)] = val;
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
                val: obj[getPrivateNameOf(propName)]
            }
        });
    }

    function listenForObjectValue(obj, propName, opt) {
        pubnub.subscribe({
            channel: opt.channel,
            message: function(message, env, channel) {
                console.log("OBJ: ", obj, " HEARD: ", message, " ON: ", channel, " WITH: ", opt);
                if (message['type'] == "propVal" &&
                        message['objId'] == obj.id &&
                        message['prop'] == propName) {
                    console.log("^SYNCING");
                    obj[getPrivateNameOf(propName)] = message.val;
                    opt.onSet(message.val);
                }
            }
        });
    }

    // TODO: Make sure this is reliable even if a single message is missed...
    // - Right now, just sends entire array
    function defineModelArray(obj, propName, opt) {
        obj[getPrivateNameOf(propName)] = [];
        obj[opt.addName] = getAddFunction(obj, propName, opt);
        obj[opt.removeName] = getRemoveFunction(obj, propName, opt);
        if (opt.listen !== false)
            listenForArrayChange(obj, propName, opt);
    }

    function getAddFunction(obj, propName, opt) {
        return function (toAdd) {
            obj[getPrivateNameOf(propName)].push(toAdd);
            if(opt.broadcast !== false)
                pubnub.publish({ // TODO: Refactor and remove duplication
                    channel: opt.channel,
                    message: {
                        type: 'arrayValAdd',
                        objId: obj.id,
                        prop: propName,
                        val: obj // ineffiecient, but reliable
                    }
                });
        };
    }

    function getRemoveFunction(obj, propName, opt) {
        return function (toRemove) {
            obj[getPrivateNameOf(propName)].remove(toRemove);
            if(opt.broadcast !== false)
                pubnub.publish({
                    channel: opt.channel,
                    message: {
                        type: 'arrayValRemove',
                        objId: obj.id,
                        prop: propName,
                        val: obj // ineffiecient, but reliable
                    }
                });
        };
    }

    function listenForArrayChange(obj, propName, opt) {
        pubnub.subscribe({
            channel: opt.channel,
            message: function(message, env, channel) {
                if (message['type'] == "arrayValRemove" || message['type'] == "arrayValAdd" &&
                        message['objId'] == obj.id &&
                        message['prop'] == propName) {
                    obj[getPrivateNameOf(propName)] = message.val;
                }
            }
        });
    }


    // By using a private name, setter/getter don't go off when value changes
    function getPrivateNameOf(propName) {
        return "_" + propName;
    }

    // ---Utility---
    function safeCb(object, fnctName) {
        return function(a) {
            console.log("SAFE CALLBACK: ", a);
            var fnct = object[fnctName];
            if (fnct) {
                fnct(a);
            }
        };
    }
})();