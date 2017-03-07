const ursa = require('ursa');
const net = require('net');
const jsocket = require('json-socket');

const aes256 = require('../crypto/aes256.js');

const endpoint = {host: '127.0.0.1', port: 7777};

var client = function()
{
};

var onanything = function(connection, reject)
{
    var wipe = function()
    {
        try
        {
            connection.destroy();

            if(!('rejected' in connection))
                reject();

            connection.rejected = true;
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
}

module.exports = {
    signup: function(user, password)
    {
        return new Promise(function(resolve, reject)
        {
            var cipher = new aes256(password);
            var rsa = ursa.generatePrivateKey(2048);

            var public = rsa.toPublicPem().toString();
            var private = rsa.toPrivatePem().toString();

            var keychain = {hash: cipher.hash(), private: cipher.encrypt(private)};
            var request = {command: {domain: 'user', command: 'signup'}, payload: {user: user, public: public, keychain: keychain}};

            var connection = new jsocket(new net.Socket());
            connection.connect(endpoint.port, endpoint.host);
            // onanything(connection, reject);

            connection.on('connect', function()
            {
                console.log('Connected');
                connection.sendMessage(request);
                connection.on('message', function(message)
                {
                    console.log('Received message:', message);
                    connection.destroy();

                    if('error' in message && !rejected)
                    {
                        rejected = true;
                        reject(message.error);
                    }

                    if('status' in message && message.status == 'success')
                        resolve();
                });
            });
        });
    },
    signin: async function(user, password)
    {
        return new Promise(function(resolve, reject)
        {
            var cipher = new aes256(password);
            var request = {command: {domain: 'user', command: 'signup'}, payload: {user: user, hash: cipher.hash()}};

            var connection = new jsocket(new net.Socket());
            connection.connect(endpoint.port, endpoint.host);
            onanything(connection, reject);

            connection.on('connect', function()
            {
                connection.sendMessage(request);
                connection.on('message', function(message)
                {
                    connection.destroy();

                    if('error' in message && !rejected)
                    {
                        rejected = true;
                        reject(message.error);
                    }

                    if('status' in message && message.status == 'success')
                        resolve(cipher.decrypt(message.keychain.private));
                });
            });
        });
    }
};
