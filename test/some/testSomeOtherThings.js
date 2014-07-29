

module.exports.test = function() {
    //console.log("This is a test of something else.");
}


module.exports.testTimeout = function(t) {
    t.asyncBegin(1);
    // NO! I do not want to change my test framework just so I can find
    // a way to check if the timeout works. Don't change your code to
    // make it testable, 1) you're adding complexity which you don't need,
    // or 2) you're changing your code just so it can pass a test, and
    // thereby either losing important error information, or possibly
    // cheating.
    // Just, No. Instead, change your test to support your code.
    
    //console.log("THE TIMEOUT ERROR IS EXPECTED, AND THE TEST ACTUALLY PASSES IF THERE IS ONE.");
    setTimeout(function() {},2000);
}
