const client = require('./client/client.js');

var main = async function()
{
    try
    {
        await client.signup('rasmussen', 'mysolidpass');
        console.log('Signup successful.');
    }
    catch(error)
    {
        console.log('Error:', error);
    }
};

main();
