const path = require('path');
const bigint = require('big-integer');

const client = require('./client/client.js');
const verifier = require('./dictionary/verifier.js');

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
        var verifier = await client.signup('verifier', 'itssolidpass', {path: path.resolve(__dirname, 'data', 'verifier.db')});
        console.log('Verifier signup successful.');

        verifier.listen();
        console.log('Verifier listening.');

        var monsino = await client.signup('monsino', 'mysolidpass');
        console.log('Signup successful.');

        var pippozzi = await client.signup('pippozzi', 'hersolidpass', {path: path.resolve(__dirname, 'data', 'pi.db')});
        console.log('Recipient signup successful.');

        var n = 0;
        var accounts = [monsino, pippozzi, verifier];
        var names = ['monsino', 'pippozzi', 'verifier'];

        while(true)
        {
            console.log('Transaction', n);
            n++;

            var idx = Math.floor(Math.random() * accounts.length);
            var idy = (idx + 1 + Math.floor(Math.random() * 2)) % accounts.length;

            var sender = accounts[idx];
            var recipient = names[idy];

            console.log(n.toString() + ":", names[idx], '->', names[idy]);
            await sender.send(recipient, bigint.one);
        }

        // await monsino.send('verifier', bigint(1));
        // await pippozzi.send('monsino', bigint(5));
    }
    catch(error)
    {
        console.log('Error:', error);
    }
};

main();
