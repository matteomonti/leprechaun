const client = require('./client/client.js');

var main = async function()
{
    try
    {
        await client.signup('monti', 'mysolidpass');
        console.log('Signup successful.');

        /*var private = await client.signin('monti', 'mysolidpass');
        console.log('Signin successful');
        console.log(private);*/
    }
    catch(error)
    {
        console.log('Error:', error);
    }
};

main();
