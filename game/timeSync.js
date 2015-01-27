var PUBNUB_TIME_URL = 'http://pubsub.pubnub.com/time/0';

timeSync = {
    init: function(numTimes, wait) {
        var _this = this;
        var interval = setInterval(function() {
            _this.sampleDelay();
            if (_this.aheadBySamples.length >= numTimes) {
                clearInterval(interval);
            }
        }, wait);
    },

    sampleDelay: function() {
        var _this = this;
        var start = this.localTime();
        $.get(PUBNUB_TIME_URL, function(data) {
            var localTime = _this.localTime();
            var delay = localTime - start;
            var aheadBy = localTime - (data[0]/10000 + delay);
            _this.logSample(aheadBy);
        }, 'json');
    },

    logSample: function(delay) {
        console.log("LOG SAMPLE: ", delay, " TO: ", this.aheadBySamples);
        this.aheadBySamples.push(delay);
        this.aheadBy = calcMedian(this.aheadBySamples);
        console.log("AHEAD BY: ", this.aheadBy);
    },

    now: function() {
        var now = this.localTime() - this.aheadBy;
        console.log("NOW: ", now, "AHEAD BY: ", this.aheadBy);
        return now;
    },

    localTime: function() {
        return new Date().getTime();
    },
};

function calcMedian(values) {
    values.sort( function(a,b) {return a - b;} );
    var half = Math.floor(values.length/2);

    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;
}

function calcTrimmedMean(array, p) {
    var outliersRemoved = removeOutliers(array, p);
    console.log("OUTLIERS REMOVED: ", outliersRemoved);
    return calcAverage(outliersRemoved);
}

function removeOutliers(array, p) {
    var len = array.length;
    var newArray = [];
    array.sort();
    var numToRemove = roundToEven(len*p);
    if (numToRemove >= len) {
        numToRemove = len - 1;
    }
    var leftIndex = Math.ceil(numToRemove / 2);
    var rightIndex = Math.floor(len - numToRemove / 2);
    return array.slice(leftIndex, rightIndex);
}

function calcAverage(array) {
    var total = 0;
    for (var i = array.length - 1; i >= 0; i--) {
        total += array[i];
    }
    return total / array.length;
}

function roundToEven(num) {
    return 2 * Math.round(num / 2);
}

timeSync.aheadBySamples = [];

timeSync.init(10, 500);