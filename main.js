const path = require('path');

const dictionary = require('./dictionary/dictionary.js');
const verifier = require('./dictionary/verifier.js');

var dbpath = path.join(__dirname, 'data', 'leprechaun.db');
var mydict = new dictionary(dbpath, 'provable');

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
            var response = await mydict.remove(i.toString());

            if(verifier.remove(response))
                console.log('Verification succeeded');
            else
            {
                console.log('Verification failed');
                process.exit();
            }
        }

        console.log('Removal completed');
    }
    catch(error)
    {
        console.log('Error:', error);
        process.exit();
    }
};

main();
