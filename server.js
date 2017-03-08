const path = require('path');

const server = require('./server/server.js');

var dbpath = path.join(__dirname, 'data', 'leprechaun.db');
var myserver = new server(dbpath, 7777);

var main = async function()
{
};

main();
