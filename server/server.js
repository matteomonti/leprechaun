const database = require('../database/database.js');
const dictionary = require('../dictionary/dictionary.js');

module.exports = function(path)
{
    // Self

    var self = this;

    // Members

    var db = database.open(path);
    var accounts = new dictionary(db, 'accounts');

    // Methods

    self.setup = async function()
    {
        await accounts.setup();
    }
};
