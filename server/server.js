const bigint = require('big-integer');
const net = require('net');
const jsocket = require('json-socket');
const joi = require('joi');

const database = require('../database/database.js');
const server_database = require('../database/server.js');
const dictionary = require('../dictionary/dictionary.js');
const verifier = require('../dictionary/verifier.js');

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
                return null;

            var response = await accounts.add('users/' + user, {public: public, balance: bigint.zero.toString()});

            await tables.keychain.add(user, keychain);
            var account = await accounts.get('users/' + user);

            var update = {command: {domain: 'user', command: 'signup'}, log: response};

            var version = await tables.version.get();
            await tables.update.add(version, update);
            await tables.version.set(version.add(1));

            await db.commit();

            updates.dispatch();

            return account;
        },
        signin: async function(user, hash)
        {
            var keychain = await tables.keychain.get(user);
            var account = await accounts.get('users/' + user);

            if(!keychain)
                return null;

            if(keychain.hash != hash)
                return null;

            return {keychain: keychain, account: account};
        }
    };

    // Private methods

    var updates = {
        cursor: 0,
        subscribers: {},
        dispatch: async function(version, id)
        {
            if(typeof(version) == 'undefined' || typeof(version) == 'number')
            {
                updates.dispatch(await tables.version.get(), version);
                return;
            }

            if(typeof(id) != 'undefined')
            {
                (async function()
                {
                    console.log('Dispatching updates up to ', version.toString(), 'to', id);
                    var subscriber = updates.subscribers[id];

                    while(subscriber.updates.version.lt(version))
                    {
                        try
                        {
                            var update = await tables.update.get(subscriber.updates.version);
                            subscriber.sendMessage({version: subscriber.updates.version.toString(), update: update});
                            subscriber.updates.version = subscriber.updates.version.add(1);
                        }
                        catch(error)
                        {
                        }
                    }
                })();
            }
            else
            {
                for(var id in updates.subscribers)
                    updates.dispatch(version, id);
            }
        }
    };

    // Server

    var server = net.createServer(function(connection)
    {
        connection = new jsocket(connection);

        var wipe = function()
        {
            try
            {
                if('updates' in connection)
                    delete updates.subscribers[connection.updates.id];

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
                },
                updates: {
                    stream: {
                        user: joi.string().alphanum().min(3).max(30).required(),
                        hash: joi.string().length(64).hex().required(),
                        version: joi.string().regex(/^\d{1,15}$/)
                    }
                }
            };

            var handlers = {
                user: {
                    signup: async function(payload)
                    {
                        try
                        {
                            var account = await self.user.signup(payload.user, payload.public, payload.keychain);

                            if(account)
                                connection.sendMessage({status: 'success', account: account});
                            else
                                connection.sendMessage({error: 'username-taken'});
                        }
                        catch(error)
                        {
                            connection.sendMessage({error: 'unknown-error'});
                        }
                    },
                    signin: async function(payload)
                    {
                        try
                        {
                            var data = await self.user.signin(payload.user, payload.hash);

                            if(data)
                                connection.sendMessage({status: 'success', keychain: data.keychain, account: data.account});
                            else
                                connection.sendMessage({error: 'signin-failed'});
                        }
                        catch(error)
                        {
                            connection.sendMessage({error: 'unknown-error'});
                        }
                    }
                },
                updates: {
                    stream: async function(payload)
                    {
                        try
                        {
                            var keychain = await self.user.signin(payload.user, payload.hash);

                            if(keychain)
                            {
                                connection.sendMessage({status: 'success'});

                                connection.updates = {id: updates.cursor, version: bigint(payload.version)};
                                updates.subscribers[connection.updates.id] = connection;
                                updates.dispatch(connection.updates.id);

                                updates.cursor++;
                            }
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
