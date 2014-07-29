var assert = require('assert');

module.exports.testOne = function() {
    //console.log("Testing One");
}

module.exports.testTwo = function() {
    //console.log("Testing Two");
}

module.exports.testThree = function() {
    //console.log("Testing Three");
}

module.exports.notATest = function() {
    //console.log("This shouldn't run.");
}

module.exports.testLongRunningAsyncTest = function() {
    setTimeout(function() {
        // this should timeout if timeout arg is set to <~= 2.
    },2000);
}

var returnsAnError = function(cb) {
    cb(new Error("This is an error"));
}

module.exports.testIntercept = function(t) {
    returnsAnError(function(err) {
        assert.throws(t.intercept.bind(t,err));
    });
}

var sharedResource = function() {
    var locked = false;
    
    return {
        lock: function() {
            if (locked) {
                throw new Error("Resource is locked. Try again another time.");
            }
            //console.log("Locking Resource.");
            locked = true;
        },
        unlock: function() {
            if (!locked) {
                throw new Error("Resource wasn't locked. What were you thinking?");
            }
            //console.log("Unlocking Resource");
            locked = false;
        }
    }
}();

module.exports.testSharedResource1 = function(t) {
    t.asyncBegin();
    setTimeout(function() {
        sharedResource.lock();
        setTimeout(function() {
            sharedResource.unlock();
            t.asyncEnd();
        },2000);
    },500);
}

module.exports.testSharedResource2 = function(t) {
    setTimeout(t.async(function() {
        sharedResource.lock();
        setTimeout(t.async(function() {
            sharedResource.unlock();
        }),1000)
    }),1500);
}
