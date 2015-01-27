var PUBNUB_TIME_URL = 'http://pubsub.pubnub.com/time/0';

timeSync = {
    init: function(initComplete) {
        var _this = this;
        var start = this.localTime();
        $.get(PUBNUB_TIME_URL, function(data) {
            var localTime = _this.localTime();
            var delay = localTime - start;
            console.log("TIME DATA RECIEVED: ", data[0]);
            _this.aheadBy = localTime - (data[0]/10000 + delay);
        }, 'json');
    },

    now: function() {
        var now = this.localTime() - this.aheadBy;
        console.log("NOW: ", now, "AHEAD BY: ", this.aheadBy);
        return now;
    },

    localTime: function() {
        return new Date().getTime();
    }
};

timeSync.init();