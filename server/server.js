const bigint = require('big-integer');

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

    self.user = {
        signup: async function(user, public, keychain)
        {
            await db.begin();

            if(await tables.keychain.get(user))
                return false;

            var response = await accounts.add('users/' + user, {public: public, balance: bigint.zero.toString()});
            await tables.keychain.add(user, keychain);

            var update = {action: 'user.signup', log: response};

            var version = await tables.version.get();
            await tables.update.add(version, update);
            await tables.version.set(version.add(1));

            await db.commit();

            dispatch();

            return true;
        }
    };

    // Private methods

    var dispatch = function()
    {
    };
};