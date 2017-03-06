const path = require('path');

const server = require('./server/server.js');

var dbpath = path.join(__dirname, 'data', 'leprechaun.db');
var myserver = new server(dbpath);

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
    try
    {
        await myserver.setup();
        console.log('Setup completed');

        await myserver.play();
        console.log('Completed');
    }
    catch(error)
    {
        console.log('Error:', error);
    }
};

main();
