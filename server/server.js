const bigint = require('big-integer');
const net = require('net');
const jsocket = require('json-socket');
const joi = require('joi');

const database = require('../database/database.js');
const server_database = require('../database/server.js');
const dictionary = require('../dictionary/dictionary.js');

module.exports = function(path, port)
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

    // Server

    var server = net.createServer(function(connection)
    {
        connection = new jsocket(connection);

        var wipe = function()
        {
            try
            {
                console.log('Destroying connection.');
                connection.destroy();
            }
            catch(error)
            {
            }
        };

        connection.setTimeout(60000);
        connection.on('timeout', wipe);

        connection.on('error', wipe);
        connection.on('close', wipe);
        connection.on('end', wipe);

        connection.on('message', function(message)
        {
            var schemas = {
                user: {
                    signup: {
                        user: joi.string().alphanum().min(3).max(30).required(),

                    }
                }
            };

            var handlers = {
                user: {
                    signup: function(message)
                    {
                        console.log('Received signup request!');
                    }
                }
            };

            if(!('command' in message) || !('domain' in message.command) || !('command' in message.command) || !(message.command.domain in handlers) || !(message.command.command in handlers[message.command.domain]) || !('payload' in message))
            {
                connection.sendMessage({error: 'command-unknown'});
                return;
            }

            handlers[message.command.domain][message.command.command](message.payload);
        });
    });

    // server.listen(port);
};
