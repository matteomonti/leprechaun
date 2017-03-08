const client = require('./client/client.js');

var main = async function()
{
    try
    {
        //await client.signup('monti', 'mysolidpass');
        //console.log('Signup successful.');

        await client.listen('monti', 'mysolidpass');
    }
    catch(error)
    {
        console.log('Error:', error);
    }
};

main();
