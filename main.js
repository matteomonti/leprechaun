const path = require('path');

const server = require('./server/server.js');

var dbpath = path.join(__dirname, 'data', 'leprechaun.db');
var myserver = new server(dbpath);

var main = async function()
{
    try
    {
        await myserver.setup();
        console.log('Setup completed');

        await myserver.user.signup('monsino', 'monsino\'s public key', {private: 'monsino\'s private key', hmac: 'monsino\'s hmac', hash: 'monsino\'s hash'});
        console.log('Signup completed');
    }
    catch(error)
    {
        console.log('Error:', error);
    }
};

main();
