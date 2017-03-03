const path = require('path');

const database = require('./database/dictionary.js');

var dbpath = path.join(__dirname, 'data', 'leprechaun.db');
var mydb = new database(dbpath, 'provable');

mydb.setup().then(async function()
{
    await mydb.set('emma', {awesome: true});
    await mydb.set('watson', {surnameof: 'emma'});
    console.log(await mydb.get('emma'));
    console.log(await mydb.get('watson'));
    await mydb.set('watson', {alsosurnameof: 'john'});
    console.log(await mydb.get('watson'));
}).then(function()
{
    console.log('Completed');
});
