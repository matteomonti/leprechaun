const database = require('../database/database.js');
const server_database = require('../database/server.js');
const dictionary = require('../dictionary/dictionary.js');

module.exports = function(path)
{
    // Self

    var self = this;

    // Members

    var db = database.open(path);
    var accounts = new dictionary(db, 'accounts');
    var tables = new server_database(db);

    // Methods

    self.setup = async function()
    {
        await db.begin();
        await accounts.setup();
        await tables.setup();
        db.commit();
    }

    self.play = async function()
    {
        console.log(await tables.keychain.get('emma'));
        await tables.keychain.add('emma', {private: 'upsy dupsy!', hmac: 'my hmac', hash: 'hash me babe one more time'});
        console.log(await tables.keychain.get('emma'));
        await tables.keychain.remove('emma');
        console.log(await tables.keychain.get('emma'));
    };
};
