const path = require('path');

const client = require('./client/client.js');
const verifier = require('./dictionary/verifier.js');

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

var sleep = function(milliseconds)
{
    return new Promise(function(resolve)
    {
        setTimeout(resolve, milliseconds);
    });
};

var main = async function()
{
    try
    {
        var myclient = await client.signup('monti', 'mysolidpass');
        console.log('Signup successful.');

        //var myclient = new client.client();
        //B myclient.listen();

        while(true)
        {
            await sleep(10000);
            await client.signup(makeid(), makeid(), {path: path.resolve(__dirname, 'data', 'fake.db')});
        }
    }
    catch(error)
    {
        console.log('Error:', error);
    }
};

main();
