const ursa = require('ursa');
const net = require('net');
const jsocket = require('json-socket');

const aes256 = require('../crypto/aes256.js');
const transaction = require('../network/transaction.js');

const endpoint = {host: '127.0.0.1', port: 7777};

module.exports = {
    signup: function(user, password)
    {
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
                return;
            else
                throw 'Unknown error';
        });
    },
    signin: async function(user, password)
    {
        return transaction(endpoint, async function(connection)
        {
            var cipher = new aes256(password);
            var request = {command: {domain: 'user', command: 'signin'}, payload: {user: user, hash: cipher.hash()}};

            connection.send(request);
            var response = await connection.receive();

            if('error' in response)
                throw response.error;

            if('status' in response && response.status == 'success')
                return cipher.decrypt(response.keychain.private)
            else
                throw 'Unknown error';
        });
    },
    listen: async function(user, password)
    {
        return transaction(endpoint, async function(connection)
        {
            var cipher = new aes256(password);
            var request = {command: {domain: 'updates', command: 'stream'}, payload: {user: user, hash: cipher.hash(), version: '0'}};

            connection.send(request);

            while(true)
            {
                var response = await connection.receive();
                console.log(response);
            }
        });
    }
};
