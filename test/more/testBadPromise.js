module.exports.testPromise = function(t) {
    
    t.promise({
        then: function(good,bad) {
            setTimeout(bad.bind(null,new Error("Promise could not be fulfilled")),500);
        }
    })
}
