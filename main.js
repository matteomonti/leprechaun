const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dictionary = require('./dictionary/dictionary.js');
const verifier = require('./dictionary/verifier.js');

var dbpath = path.join(__dirname, 'data', 'leprechaun.db');
var mydict = new dictionary(new sqlite3.Database(dbpath), 'provable');

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function sleep(milliseconds)
{
    return new Promise(function(resolve)
    {
        setTimeout(resolve, milliseconds);
    });
}

var log = {
    log: console.log,
    enable: function()
    {
        console.log = log.log;
    },
    disable: function()
    {
        console.log = function() {}
    }
};

var main = async function()
{
    await mydict.setup();
    console.log('Setup completed');

    for(var i = 0; i < 128; i++)
        await mydict.add(i.toString(), {random: makeid()});

    console.log('Insertion completed');

    try
    {
        for(var i = 0; i < 128; i++)
        {
            var response = await mydict.update(i.toString(), {anotherrand: makeid()});

            if(verifier.update(response))
                console.log('Verification succeeded');
            else
                console.log('Verification failed');
        }
    }
    catch(error)
    {
        console.log('Error:', error);
        process.exit();
    }
};

main();
