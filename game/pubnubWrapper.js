var Channel = function(channel) {
    var self = this;
    this.listeners = [];

    this.listen = function(cb) {
        self.listeners.push(cb);
    };

    console.log("PUBNUB APPER LISTENING ON: ", channel, " PUBNUB: ", pubnub);
    pubnub.subscribe({
        channel: channel,
        message: function(msg, env, chnl) {
            console.log("HEARD: ", msg, " ON: ", chnl);
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