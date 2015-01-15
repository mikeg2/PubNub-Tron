var CONNECTION_SETTINGS = {
        publish_key: 'pub-c-b5297e29-6bc0-49a8-8af9-6f8b2419f048',
        subscribe_key: 'sub-c-e96aef6a-9ba2-11e4-951c-0619f8945a4f'
    };

// Wraps Pubnub to allow for multiple subscribe calls (now called "listen")
var Channel = function(channel) {
    var self = this;
    this.pubnub = pubnub = PUBNUB.init(CONNECTION_SETTINGS);
    this.listeners = [];

    this.listen = function(cb) {
        self.listeners.push(cb);
    };
    this.broadcast = this.pubnub.broadcast;

    pubnub.subscribe({
        channel: channel,
        windowing: 30,
        message: function(msg, env, chnl) {
            for (var i = self.listeners.length - 1; i >= 0; i--) {
                var listener = self.listeners[i];
                listener(msg, env, chnl);
            }
        }
    });
};

var getChannel = function (channelName) {
    if (!getChannel.channels[channelName]) {
        getChannel.channels[channelName] = new Channel(channelName);
    }
    return getChannel.channels[channelName];
};
getChannel.channels = {};