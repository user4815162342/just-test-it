#!/usr/bin/node
var fs = require('fs');
var path = require('path');
var util = require('util');
var domain = require('domain');
var trace = require('stack-trace');

var Test = function(file,name,func) {
    
    var blocked = 0;
    var blockTimeout = null;
    var done;
    
    var error = function(err) {
        // we can't tag strings with the file and name, making
        // it more difficult to report. But, I don't want to
        // turn it into an Error, because the stack will be wrong.
        if (typeof err === "string") {
            err = {
                message: err,
                toString: function() {
                    return this.message;
                }
            }
        }            
        err.file = file;
        err.test = name;
        done(err);
    }
    
    this.run = function(cb) {
        // domains are used here to accurately 
        // reflect the test that started async calls.
        done = cb;
        var d = domain.create();
        d.on('error',error);
        d.run(func.bind(null,this));
        if (!blocked) {
            done();
        }
    }

    // NOTE: skipErrorStack is undocumented, and is intended only
    // for internal purposes, it might go away some day.    
    this.asyncBegin = function(timeout,skipErrorStack) {
        if (blocked === 0) {
            // we need a timeout, whether they like it or not.
            if (typeof timeout === "undefined") {
                timeout = 5;
            } else {
                timeout = timeout;
            }
            if ((blockTimeout === null) && (timeout !== 0)) {
                // Here's a trick. I'm creating the error here, so I
                // can get the stack trace that includes the call to beginAsync.
                var err = new Error(util.format("Timeout of %d second%s exceeded",timeout,timeout > 1 ? "s": ""));
                err.skip = skipErrorStack || 1;
                blockTimeout = setTimeout(function() {
                    return error(err);
                },timeout * 1000);
            }
        }
        blocked += 1;
        
    }
    
    this.asyncEnd = function() {
        if (blocked === 0) {
            var err = new Error(util.format("An extra call to asyncEnd was made"));
            err.skip = 1;
            throw err;
        }
        blocked -= 1;
        if (blocked === 0) {
            clearTimeout(blockTimeout);
            blockTimeout = null;
            done();
        }
    }
}

Test.prototype.intercept = function(err) {
    if ((typeof err !== "undefined") && (err !== null)) {
        if (!(err instanceof Error)) {
            // make sure we do this so we can get a stack trace.
            throw new Error(err);
        } else {
            throw err;
        }
    }
};

Test.prototype.async = function(timeout,wrapped) {
    if (typeof timeout === "function") {
        wrapped = timeout;
        timeout = void 0;
    }
    // start the async now, so we know we're supposed
    // to wait for this function to be called.
    this.asyncBegin(timeout,2);
    
    // This is the function that will actually be called.
    return function() {
        // call the wrapped function
        wrapped.apply(null,Array.prototype.slice.call(arguments,0));
        // Then stop the async. (If the wrapped function
        // started it, then it's nested, and this stop won't
        // do anything).
        this.asyncEnd();
    }.bind(this);
}

var runTests = function(tests,report,done) {
    
    var runTest = function() {
        if ((tests.length > 0)) {
            var test = tests.shift();
            test.run(function(err) {
                report(err);
                process.nextTick(runTest);
            });
        } else {
            done();
        }
    }
    
    process.nextTick(runTest);
}



var runFiles = function(files,report,done) {
    
    var runFile = function() {
        if (files.length) {
            var file = files.shift();
            var test;
            try {
                test = require(file);
            } catch (e) {
                // add a file on so we can report it.
                e.file = file;
                report(e);
                return process.nextTick(runFile);
            }
            var tests = Object.keys(test).filter(function(key) {
                return (key.indexOf("test",0) > -1) &&
                        (typeof test[key] === "function");
            }).map(function(key) {
                return new Test(file,key,test[key].bind(test));
            });
            runTests(tests,report,function() {
                // errors are reported, tests do not fail on error.
                process.nextTick(runFile);
            });
        } else {
            done();
        }
    }
    
    process.nextTick(runFile);
}

var main = function(args) {


    var processArgs = function(args,cb) {
        var result = {
            timeout: 0,
            testDir: path.join(process.cwd(),"test"),
            testFiles: []
        }
        var i = 0;
        while (i < args.length) {
            switch (args[i]) {
                case "--timeout":
                    i += 1;
                    if (i < args.length) {
                        result.timeout = parseFloat(args[i]);
                        if (Number.isNaN(result.timeout)) {
                            return cb("Invalid value for timeout: " + args[i]);
                        }
                    } else {
                        return cb("timeout not specified.");
                    }
                    break;
                case "--test-dir":
                    i += 1;
                    if (i < args.length) {
                        result.testFiles = [];
                        result.testDir = path.resolve(process.cwd(),args[i]);
                    } else {
                        return cb("test-dir not specified.");
                    }
                    break;
                case "--test-file":
                    i += 1;
                    if (i < args.length) {
                        result.testDir = null;
                        result.testFiles.push(path.resolve(process.cwd(),args[i]));
                    } else {
                        return cb("test-file not specified.");
                    }
                    break;
                default:
                    return cb("Unknown argument: " + args[i]);
                    return;
            }
            i += 1;
        }
        return cb(null,result);
    }
    
    var exitCode = 0;
    
    // names taken from node source code.
    var builtInModules = ["node.js",
        "assert.js","buffer.js","child_process.js","cluster.js","console.js",
        "constants.js","crypto.js","dgram.js","dns.js","domain.js","events.js",
        "freelist.js","fs.js","http.js","https.js","module.js","net.js","os.js",
        "path.js","punycode.js","querystring.js","readline.js","repl.js","smalloc.js",
        "stream.js","string_decoder.js","sys.js","timers.js","tls.js","tracing.js",
        "tty.js","url.js","util.js","vm.js","zlib.js"]
        
    
    var reportError = function(err) {
        
        if (err) {
            if (err.test) {
                console.error("%s failed: %s",err.test,err.message)
            } else if (err.file) {
                console.error("%s failed: %s",err.file,err.message);
                if (err instanceof SyntaxError) {
                    // The stack of a SyntaxError might not be correct
                    // with a require.
                    // It seems to start out with node's module.js file
                    // instead of the file it occurred in (unless it's
                    // an eval), and doesn't provide a line number
                    // value on the object.
                    // What's worse is that the 'require' itself writes
                    // the Syntax Error message straight to console.error,
                    // skipping all of this, and it *does* have a file and
                    // line number, unfortunately it doesn't match geany's
                    // error regex, so it doesn't make it easy to find.
                    // FUTURE: Options:
                    // 1. Parse this with acorn, or something. Except 
                    // that the syntax error might actually be in a 
                    // file that was required by this file. I suppose 
                    // acorn would be able to help me with that, too, since I could
                    // look for 'require' function calls. 
                    // 2. Override stderr.write, and compare it to
                    // the things I've written. Hide stuff if I didn't
                    // write them, but keep them in memory. When I 
                    // see a SyntaxError, go back through the lines
                    // to find the message, and parse out the file name
                    // and line number, then output the message more
                    // appropriately.
                    // 3. Just let the user worry about it.
                    console.error("%s:1:1",err.file)
                }
            } else if (err.message) {
                console.error("Error occurred: %s",err.message);
            } else {
                // this is probably just a string message I wanted to send
                // to console.error.
                console.error(err);
            }
            
            if (err.stack) {
                
                var stack = trace.parse(err);
                if (stack.length > 0) {
                    // The skip allows us to throw errors that point
                    // to the test itself.
                    for (var i = err.skip || 0; i < stack.length; i++) {
                        // Occasionally, I seem to get some errors with no parseable filename.
                        // If so, it's useless anyway.
                        // Also, I can skip the built-in modules.
                        if ((stack[i].getFileName() !== null) &&
                            (builtInModules.indexOf(stack[i].getFileName()) === -1)) {
                            console.error("%s:%d:%d",stack[i].getFileName(),stack[i].getLineNumber(),stack[i].getColumnNumber());
                        }
                        // don't go any further if we're at the test file for this error,
                        // because this is where it probably happened.
                        if (err.file && (stack[i].getFileName() === err.file)) {
                            break;
                        }
                    }
                } else {
                    console.error(err.stack);
                }
            } else if (err.file) {
                // I really wish I could get the line number of the testing function,
                // but I can't get a line number for a function that I can't throw an error from.
                // So, simulate line 1 to let the user be able to at least find the file
                // in an IDE.
                console.error("%s:1:1: %s",err.file,err)
                console.error("    (To get more information, such as an accurate line number, make sure all thrown objects are Errors)");
            } 
            exitCode = 1;
            return true;
        }
        return false;
    }
    
    var handleError = function(err) {
        if (reportError(err) || (exitCode !== 0)) {
            process.exit(exitCode);
        }
    }
    
    process.on('uncaughtException',handleError);
    
    process.on('exit',function(code) {
        if (code == 0) {
            console.log("Everything appears to be okay.");
        }
    });

    processArgs(args,function(err,options) {
        handleError(err);
        
        // This is a "global" timeout.
        if (options.timeout !== 0) {
            console.log("Expecting tests to finish within %d second%s",options.timeout,(options.timeout > 1) ? "s": "");
            setTimeout(function() {
                handleError(util.format("Timeout of %d second%s exceeded.",options.timeout,options.timeout > 1 ? "s": ""));
            },options.timeout * 1000).unref();
            // Note the unref. This allows me to set the timer, but not
            // leave the program running when everything else is running.
            // You learn something new every day.
        }
        
        if (options.testDir) {
            fs.readdir(options.testDir,function(err,files) {
                handleError(err);
                runFiles(files.filter(function(file) {
                    return (file.lastIndexOf("test",0) > -1) &&
                            (path.extname(file) === ".js");
                }).map(function(file) {
                    return path.join(options.testDir,file)
                }),reportError,handleError)
            });
        } else {
            runFiles(options.testFiles.map(function(file) {
                return path.resolve(process.cwd(),file);
            }),reportError,handleError);
        }
    });
    
}





main(process.argv.slice(2));
