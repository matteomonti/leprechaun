const ursa = require('ursa');
const net = require('net');
const jsocket = require('json-socket');
const path = require('path');
const bigint = require('big-integer');

const aes256 = require('../crypto/aes256.js');
const transaction = require('../network/transaction.js');
const database = require('../database/client.js');
const verifier = require('../dictionary/verifier.js');

const endpoint = {host: '127.0.0.1', port: 7777};
const defaults = {path: path.join(__dirname, '..', 'data', 'client.db')}

module.exports = {
    client: function(settings)
    {
        // Defaults

        settings = settings || defaults;

        // Self

        var self = this;

        // Members

        var db = new database(settings.path);

        var user;
        var password;
        var cipher;
        var public;
        var private;

        var version;
        var root;

        // Methods

        self.listen = async function()
        {
            return transaction(endpoint, async function(connection)
            {
                await load();

                var request = {command: {domain: 'updates', command: 'stream'}, payload: {user: user, hash: cipher.hash(), version: version.toString()}};
                console.log(request);
                connection.send(request);

                var response = await connection.receive();
                if(!('status' in response) || response.status != 'success')
                    throw response.error; // Should auto-reconnect

                console.log('Listening for updates');

                var handlers =
                {
                    user:
                    {
                        signup: function(log)
                        {
                            if(log.root.before != root)
                            {
                                console.log('Root does not match');
                                return null;
                            }

                            if(!verifier.add(log))
                            {
                                console.log('Verification failed...!!');
                                return null;
                            }

                            return log.root.after;
                        }
                    }
                };

                while(true)
                {
                    var update = await connection.receive();
                    console.log(update.update.log);

                    update.version = bigint(update.version);
                    if(!update.version.eq(version))
                        throw 'Out of sync';

                    var new_root = handlers[update.update.command.domain][update.update.command.command](update.update.log)
                    if(!new_root)
                        throw 'Security compromised.';

                    console.log('Update successfully verified');

                    version = version.add(1);
                    root = new_root;

                    db.begin();
                    db.version.set(version);
                    db.root.set(root);
                    db.commit();
                }
            });
        };

        // Private methods

        var load = async function()
        {
            if(!user)
            {
                user = await db.user.get();
                password = await db.password.get();
                cipher = new aes256(password);
                public = await db.public.get();
                private = await db.private.get();

                version = await db.version.get();
                root = await db.root.get()
            }
        }
    },
    signup: function(user, password, settings)
    {
        settings = settings || defaults;

        return transaction(endpoint, async function(connection)
        {
            var cipher = new aes256(password);
            var rsa = ursa.generatePrivateKey(2048);

            var public = rsa.toPublicPem().toString();
            var private = rsa.toPrivatePem().toString();

            var keychain = {hash: cipher.hash(), private: cipher.encrypt(private)};
            var request = {command: {domain: 'user', command: 'signup'}, payload: {user: user, public: public, keychain: keychain}};

            connection.send(request);
            var response = await connection.receive();

            if('error' in response)
                throw response.error;

            if('status' in response && response.status == 'success')
            {
                if(!(verifier.get(response.account)))
                    throw "Security compromised.";

                var db = new database(settings.path);
                await db.setup();

                await db.begin();
                await db.user.set(user);
                await db.password.set(password);
                await db.public.set(public);
                await db.private.set(private);
                await db.root.set(verifier.first());
                await db.version.set(bigint.zero);

                for(var id in response.account.proof)
                    await db.proof.set(id, response.account.proof[id]);

                await db.commit();

                return new module.exports.client(settings);
            }
            else
                throw 'Unknown error';
        });
    },
    signin: async function(user, password, settings)
    {
        settings = settings || defaults;

        return transaction(endpoint, async function(connection)
        {
            var cipher = new aes256(password);
            var request = {command: {domain: 'user', command: 'signin'}, payload: {user: user, hash: cipher.hash()}};

            connection.send(request);
            var response = await connection.receive();

            if('error' in response)
                throw response.error;

            if('status' in response && response.status == 'success')
            {
                if(!(verifier.get(response.account)))
                    throw "Security compromised.";

                var db = new database(settings.path);
                await db.setup();

                await db.begin();
                await db.user.set(user);
                await db.password.set(password);
                await db.public.set(response.account.payload.content.public);
                await db.private.set(cipher.decrypt(response.keychain.private));
                await db.root.set(verifier.first());
                await db.version.set(bigint.zero);

                for(var id in response.account.proof)
                    await db.proof.set(id, response.account.proof[id]);

                await db.commit();

                return new module.exports.client(settings);
            }
            else
                throw 'Unknown error';
        });
    }
};
