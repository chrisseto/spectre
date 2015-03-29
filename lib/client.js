module.exports = {
    waitForMySignal: function(time) {
        if(typeof(window.callPhantom) == "function") {
            window.callPhantom('spectre.Wait', time);
        }
    },
    signal: function() {
        if(typeof(window.callPhantom) == "function") {
            window.callPhantom('spectre.Done');
        }
    }
};
