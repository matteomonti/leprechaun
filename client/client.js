const ursa = require('ursa');
const net = require('net');
const jsocket = require('json-socket');
const path = require('path');
const bigint = require('big-integer');

const aes256 = require('../crypto/aes256.js');
const sha256 = require('../crypto/sha256.js');
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

        var rsa;

        var public;
        var private;

        var version;
        var root;

        var last;

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
                            if(log.payload.content.balance != bigint.zero.toString())
                            {
                                console.log('More than zero balance');
                                return null;
                            }

                            if(!bigint(log.payload.content.last).eq(version))
                            {
                                console.log('Last action was counterfeit');
                                return null;
                            }

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
                    },
                    transaction:
                    {
                        send: function(log)
                        {
                            if(log.send.root.before != root)
                            {
                                console.log('Root does not match');
                                return null;
                            }

                            var send = verifier.update(log.send);

                            var balance = mine(send.before.content);

                            if(balance.lt(bigint(log.amount)))
                            {
                                console.log('Not enough money');
                                return null;
                            }

                            var body = {command: {domain: 'transaction', command: 'send'}, payload: {recipient: log.recipient, last: send.before.content.last, amount: log.amount}};

                            if(!verify(send.before.content.public, body, log.signature))
                            {
                                console.log('Signature verification failed');
                                return null;
                            }

                            if(!(bigint(send.after.content.balance).eq(balance.minus(bigint(log.amount)))))
                            {
                                console.log('Send balance incorrect');
                                return null;
                            }

                            if(send.after.content.public != send.before.content.public)
                            {
                                console.log('Public key was changed');
                                return null;
                            }

                            if(!(bigint(send.after.content.last).eq(version)))
                            {
                                console.log('Last was not updated');
                                return null;
                            }

                            if(log.send.root.after != log.receive.root.before)
                            {
                                console.log('Roots do not match');
                                return null;
                            }

                            var receive = verifier.update(log.receive);

                            if(!(bigint(receive.after.content.balance).eq(bigint(receive.before.content.balance).add(bigint(log.amount)))))
                            {
                                console.log('Money was not received');
                                return null;
                            }

                            if(receive.after.content.public != receive.before.content.public)
                            {
                                console.log('Recipient public key was changed');
                                return null;
                            }

                            if(receive.after.content.last != receive.before.content.last)
                            {
                                console.log('Recipient last was modified');
                                return null;
                            }

                            return log.receive.root.after;
                        }
                    }
                };

                while(true)
                {
                    var update = await connection.receive();

                    update.version = bigint(update.version);
                    if(!update.version.eq(version))
                        throw 'Out of sync';

                    var new_root = handlers[update.update.command.domain][update.update.command.command](update.update.log)
                    if(!new_root)
                    {
                        console.log('Security compromised.');
                        process.exit();
                    }

                    // console.log('Update successfully verified');

                    version = version.add(1);
                    root = new_root;

                    db.begin();
                    db.version.set(version);
                    db.root.set(root);
                    db.commit();
                }
            });
        };

        self.send = function(recipient, amount)
        {
            return transaction(endpoint, async function(connection)
            {
                await load();

                var signature = sign({command: {domain: 'transaction', command: 'send'}, payload: {recipient: recipient, last: last.toString(), amount: amount.toString()}});
                var request = {command: {domain: 'transaction', command: 'send'}, payload: {user: user, hash: cipher.hash(), recipient: recipient, amount: amount.toString(), signature: signature}};

                connection.send(request);

                var response = await connection.receive();

                if(!('status' in response) || response.status != 'success')
                    throw {status: 'error', response: response};

                last = response.last;
                db.last.set(last);
            });
        };

        // Private methods

        var mine = function(account)
        {
            return bigint(account.balance).add(version).minus(bigint(account.last));
        }

        var verify = function(pubkey, message, signature)
        {
            try
            {
                var rsa = ursa.createPublicKey(pubkey);
                var digest = sha256(message);
                return rsa.publicDecrypt(signature, 'hex', 'hex') == digest;
            }
            catch(error)
            {
                return false;
            }
        };

        var load = async function()
        {
            if(!user)
            {
                user = await db.user.get();
                password = await db.password.get();
                cipher = new aes256(password);

                public = await db.public.get();
                private = await db.private.get();

                rsa = ursa.createPrivateKey(private);

                version = await db.version.get();
                root = await db.root.get()

                last = await db.last.get();
            }
        }

        var sign = function(message)
        {
            var digest = sha256(message);
            return rsa.privateEncrypt(digest, 'hex', 'hex');
        };
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
                await db.last.set(bigint(response.account.payload.content.last));

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
                await db.last.set(bigint(response.account.payload.content.last));

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
