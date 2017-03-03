const path = require('path');

const database = require('./database/dictionary.js');

var dbpath = path.join(__dirname, 'data', 'leprechaun.db');
var mydb = new database(dbpath, 'provable');

mydb.setup().then(function()
{
    console.log('Success');
}).catch(function(error)
{
    console.log(error);
});
