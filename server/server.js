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

            var update = {command: {domain: 'user', command: 'signup'}, log: response};

            var version = await tables.version.get();
            await tables.update.add(version, update);
            await tables.version.set(version.add(1));

            await db.commit();

            dispatch();

            return true;
        },
        signin: async function(user, hash)
        {
            var keychain = await tables.keychain.get(user);

            if(!keychian)
                return null;

            if(keychain.hash != hash)
                return null;

            return keychain;
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
                        public: joi.string().min(400).max(500).required(),
                        keychain: joi.object().keys({
                            hash: joi.string().length(64).hex().required(),
                            private: joi.object().keys({
                                secret: joi.string().min(3300).max(3500).hex().required(),
                                iv: joi.string().length(24).hex().required(),
                                tag: joi.string().length(32).hex().required()
                            })
                        })
                    },
                    signin: {
                        user: joi.string().alphanum().min(3).max(30).required(),
                        hash: joi.string().length(64).hex().required()
                    }
                }
            };

            var handlers = {
                user: {
                    signup: async function(payload)
                    {
                        try
                        {
                            var success = await self.user.signup(payload.user, payload.public, payload.keychain);

                            if(success)
                                connection.sendMessage({status: 'success'});
                            else
                                connection.sendMessage({error: 'username-taken'});
                        }
                        catch(error)
                        {
                            connection.sendMessage({error: 'unknown-error'});
                        }
                    },
                    signin: async function(paylaod)
                    {
                        try
                        {
                            var keychain = await self.user.signin(payload.user, payload.hash);

                            if(keychain)
                                connection.sendMessage({status: 'success', keychain: keychain});
                            else
                                connection.sendMessage({error: 'signin-failed'});
                        }
                        catch(error)
                        {
                            connection.sendMessage({error: 'unknown-error'});
                        }
                    }
                }
            };

            if(!('payload' in message) || !('command' in message) || !('domain' in message.command) || !('command' in message.command) || !(message.command.domain in handlers) || !(message.command.command in handlers[message.command.domain]) || !('payload' in message))
            {
                connection.sendMessage({error: 'command-unknown'});
                return;
            }

            var validation = joi.validate(message.payload, schemas[message.command.domain][message.command.command]);

            if(!(validation.error))
                handlers[message.command.domain][message.command.command](message.payload);
            else
                connection.sendMessage({error: 'payload-malformed'});
        });
    });

    server.listen(port);
};
