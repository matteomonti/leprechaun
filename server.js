const path = require('path');

const server = require('./server/server.js');

var dbpath = path.join(__dirname, 'data', 'server.db');
var myserver = new server(dbpath, 7777);

var main = async function()
{
    //await myserver.setup();
    //console.log('Setup completed');
    console.log('Server running');
};

main();
