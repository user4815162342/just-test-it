
module.exports.test = function() {
    // "This one's only reachable through a second command line.");
    throw "This error should be reported, but won't stop the testing. Note that it's also a string, so it won't get a stack trace.";
}

module.exports.testTooManyStops = function(t) {
    // "This one is supposed to report an error.");
    // "THE TOO MANY asyncEnds ERROR IS EXPECTED. THIS TEST PASSES IF IT APPEARS.");
    t.asyncEnd();
}
