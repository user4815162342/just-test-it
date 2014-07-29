// This is the real test. The others are just tests of functionality,
// which should actually fail, but we want them to fail, so I want to
// make sure the test reports correctly.
var cp = require('child_process');
var assert = require('assert');

// TODO: Need to compare the stdout results with expected values,
// and not report the values.
// But first, I need to create appropriate error results.

var run = function(args,cb) {
    return cp.spawn("node",["index"].concat(args),{ stdio: "pipe"}).on('close',function(code,signal) {
        if (code !== 0) {
            var err = new Error("Process Exited Abnormally");
            err.code = code;
            return cb(err);
        } else if (signal !== null) {
            var err = new Error("Process Killed");
            err.signal = signal;
            return cb(err);
        } 
        return cb();
    });
}

var readErrors = function(child,cb) {
    var result = "";
    child.stderr.setEncoding('utf8');
    child.stderr.on('data',function(data) {
        result += data;
    });
    child.stderr.on('end',function() {
        cb(null,result);
    });
    child.stderr.on('error',function(e) {
        cb(e);
    });
}

module.exports.testSome = function(t) {
    // Need a timeout here to avoid it failing.
    readErrors(run(["--test-dir","test/some"],t.async(7,function(err) {
        assert.equal(err && err.code,1,"Test of test should have failed.");
    })),function(err,data) {
        assert(!err,"Could not read from standard out");
        assert.equal(data,"testTimeout failed: Timeout of 1 second exceeded\n\
/home/neil/projects/just-test-it/test/some/testSomeOtherThings.js:9:7\n","Unexpected output from test:\n" + data);
    });

}

module.exports.testSomeTimeout = function(t) {
    // Now, try the same thing, but with a timeout at the command line.
    readErrors(run(["--test-dir","test/some","--timeout","2"],t.async(function(err) {
        assert.equal(err && err.code,1,"Test of test should have failed.");
    })),function(err,data) {
        assert(!err,"Could not read from standard out");
        assert.equal(data,"Timeout of 2 seconds exceeded.\n","Unexpected output from test:\n" + data);
    });
    
}


module.exports.testMore = function(t) {
    readErrors(run(["--test-dir","test/more"],t.async(function(err) {
        assert.equal(err && err.code,1,"Test of test should have failed.");
    })),function(err,data) {
        assert(!err,"Could not read from standard out");
        assert.equal(data,"/home/neil/projects/just-test-it/test/more/testBadFile.js failed: This test file shouldn't even run.\n\
/home/neil/projects/just-test-it/test/more/testBadFile.js:2:7\n\
test failed: This error should be reported, but won't stop the testing. Note that it's also a string, so it won't get a stack trace.\n\
/home/neil/projects/just-test-it/test/more/testMoreThings.js:1:1: This error should be reported, but won't stop the testing. Note that it's also a string, so it won't get a stack trace.\n\
    (To get more information, such as an accurate line number, make sure all thrown objects are Errors)\n\
testTooManyStops failed: An extra call to asyncEnd was made\n\
/home/neil/projects/just-test-it/test/more/testMoreThings.js:10:7\n","Unexpected output from test:\n" + data);
    });

    
}

console.log("There are a few timeout tests in here that might take a long time. Please be patient.");
