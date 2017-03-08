/*const client = require('./client/client.js');

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
        client.listen('monti', 'mysolidpass');

        while(true)
        {
            await client.signup(makeid(), makeid());
            console.log('Signup successful.');
        }
    }
    catch(error)
    {
        console.log('Error:', error);
    }
};

main();
*/

const path = require('path');
const database = require('./database/client.js');
var dbpath = path.join(__dirname, 'data', 'client.db');

var main = async function()
{
    var mydb = new database(dbpath);
    await mydb.setup();
    console.log('Setup completed.');

    console.log(await mydb.version.get());
    await mydb.version.set(143);
    console.log(await mydb.version.get());
};

main();
