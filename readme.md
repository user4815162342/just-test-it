## Just Test It!

I just want to make sure my code works. Why do I have to learn a testing
framework? Why do I need to install all sorts of programs? Can't I just
write my tests and have something run them to make sure they work?

Inspired by a chance to try 'go test' from golangs built-in testing framework...

## Yes, You Can! ##

So, you want to test your code. Okay, you could download and install 
some big testing framework. You could learn how to navigate through it's
different methods of testing different things like: 

```
  it("should be able to return true when I pass false to it",function() {
    expect(callIt(false)).to.equal.the.value.of(true);
  });
```

And then figure out how to configure and install it so that you can
run that test and get lines and lines of output, just for that simple thing.

Or, you could find some simpler, easier framework that still requires
you to know an API:

```
   test(function(t) {
      t.check(callIt(false) === true,);
      t.finish();
   }
```

Sure, that might be simpler, but why not make it even simpler yet?:

```
    module.exports.testCallIt = function() {
        assert(callIt(false),"it should be able to return true when I pass false to it");
    }
```
   
Wait a minute, 'assert' is a built-in node module. I didn't write any 
code making calls to a testing framework. How did that get tested? How 
did I tell it to log the results? How the heck did I tell it that the 
test was done?

The answer: "just-test-it" found my test function and ran it. If it didn't
throw an error, then it passed. If it did, then the test failed. All I
had to do was write the above code and call `node just-test-it`. Even
better, I put that script in my package.json and called `npm test`.

## But, What About...? ##

What about what? You probably don't need it as much as you think you do.

What about logging? Uncaught errors are reported automatically. You
don't need to know what's passing, you need to know what's failing.
If you want to add some information, go ahead, use console.log.

What about some standard report format? If you want to format
the results of your test, do it however you want. Build an XML file,
send an HTTP Response, whatever. Track the number of tests passed and
failed, and report the counts. Use TTY or ncurses tools to build fancy
progress bars. Do it however you want.

Just keep in mind that any additional code you throw in along with your
tests changes the test environment, which can affect your results. For example:
Sure, it doesn't fail in testing, because you already have that XML module
installed for testing. You forgot to require it in the production code.
Your test isn't going to tell you that.

Knowing when the test is finished? The test is finished when it's finished.
Why do you need to know? Yes, there's a built-in time-out, and yes you
can configure that further if you need to. 

Asynchronous code? Okay, you might want to deal with this. In most cases,
just have your tests run in "parallel" (but we all know node code is never
truly parallel). But, if you want to make sure two or more tests don't
run at the same time, there's a way to handle it. 

## Okay, Fine, How Do I Do This? ##

Very simple.

1. Install just-test-it:

```
    npm install just-test-it
```

(Or, require it in your devDependencies in package.json, or whatever)

2. Create a test folder in your project.

```
    mkdir test
```

Add some javascript test files into that directory. They just have
to start with the word 'test'.

```
    $ ls test
    testServerRoutines.js  testDatabaseActions.js  testWhatever.js
```

3. In each of those files, export some functions that start with the
word 'test'. This is optional, becuase just-test-it will also be running,
and therefore testing, all of the code in the test modules, above. 
But it allows a bit more customization, as described below.

```
   module.exports.testLookup = function() {
   ...
   }
   
   module.exports.testUpdate = function() {
   ...
   }
```

4. Pack it into your package.json. This is also optional, as you can
just run `node just-test-it` from the command line. But it does make
running simpler, and you don't have to remember the command-line if
you need to use some configuration.

```
    ...
    devDependencies: {
        "just-test-it": "~0.0"
    }
    ...
    scripts: {
        "test": "just-test-it"
    }
    ...
```

Since just-test-it is registered as an executable, if you install it
locally, npm test should be able to pick it up in the local path, so
you can just put the bare package name there. There is no need to 
install globally, but you can if you want.

5. Run it.

```
    npm test
```

Or, if you didn't plug it into your package.json:

```
    node just-test-it
```

## How Does it Work? ##

It should be fairly obvious. Just-test-it looks for the 'test' directory,
looks for javascript files that start with 'test', requires them, then
looks for exported functions that start with 'test', and calls them.

If anything throws an error, it will report it to stderr. If the error
has a stack, it will even put it in a format that most IDEs can use to 
find the location of the error (<filename>:<line>). It will then return
a non-zero exit code.

Simple, really.

Except that there is one very large edge case to all of this, and that 
is the asynchronous code so common in node code.

Each of the test functions is run one at a time, obviously they can't
be run at the same time. But, if they produce asynchronous code, then 
the callbacks and timeouts can easily start occurring at the same time,
in effect running your tests in parallel.

If this isn't a problem, then you don't need to worry about it. But,
occasionally, youre tests require access to some resource, perhaps in
the file system, which they can't access at the same time. Then, they
need to be run in series. Don't worry. The API provides some utilities 
to help with asynchronous code. Read on.

## There's Got To Be More Than This, Right? ##

Most tests can get by with just the above. But, just-test-it does
provide a few tools that can help in a few cases.

There are two ways to get to this 'more'. You can pass parameters
to the command line, or you can have your 'test' functions accept a 
single parameter, which provides an API to access to some tools.

### Command Line Parameters ###

`--timeout <number>`: Specify a number, in seconds, in which the
tests are expected to run. If this is not set, just-test-it will continue 
running until the tests finish themselves. If this is set, an error will
be logged when the timeout is exceeded, and the process exited.

`--test-dir <directory>`: If you need to keep your tests in some other 
directory than 'test', you can pass that directory at the command line. 

`--test-file <filename>`: If you just want to run the tests in one specific
file, without searching a directory, you can do this. Pass this argument
multiple times to test a whole bunch at once.

### API ###

To get access to the API for a test, just look at the arguments to your
test function.

```
    module.exports.testStrings = function(test) {
    ...
    }
```

This object provides some functions which can be used to help in your 
testing. Here they are:

* `test.asyncBegin(timeout?)`: Include this at the beginning of your test
method, or at least before it spawns any asynchronous code, and just-test-it
will work to block other tests from being initiated, until your test
calls `asyncEnd`. Nothing can be done about tests that have already been 
initiated, so if you are worried about that, you will have to go back 
and add this to them.

The timeout tells just-test-it how long to wait for that `asyncEnd`,
in seconds. If it takes too long, just-test-it will report an error.
But, that doesn't mean it will stop processing. The default timeout for
this is about 5 seconds, but you can set it to no timeout at all
by specifying 0.

These calls can be nested, (or interleaved if you want to run two
parallel functions in one test) and the blocking will not be complete until
all 'asyncBegins' are matched up with a 'asyncEnd'.

* `test.asyncEnd()`: Include this when all of your asynchronous testing
code is finished, otherwise the test will timeout instead.

* `test.async(timeout?,cb)`: Include this when you're creating a callback
for an asynchronous function. It will immediately call 'asyncBegin', and
then return a function which can be used as a callback for the async
function. That function will pass all of its arguments into your callback,
and then call 'asyncEnd' when it returns.

* `test.intercept(error?)`: If a value is passed to this function, it will
immediately throw it. If not, it will simply return. This is just a useful
little sugar for handling those callback errors, without having to write
a conditional. The fact that it throws the error allows you to get a
stack trace, for reporting where you found the error. 
