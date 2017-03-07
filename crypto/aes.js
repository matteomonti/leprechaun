const crypto = require('crypto');

const algorithm = 'aes-128-gcm';

module.exports = {
    encrypt: function(message, key, iv)
    {
        key = new Buffer(key, 'hex');
        iv = new Buffer(iv, 'hex');

        message = JSON.stringify(message);

        var cipher = crypto.createCipheriv(algorithm, key, iv);
        var encrypted = cipher.update(message, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        var hmac = cipher.getAuthTag().toString('hex');

        return {message: encrypted, hmac: hmac};
    },
    decrypt: function(message, key, iv, hmac)
    {
        key = new Buffer(key, 'hex');
        iv = new Buffer(iv, 'hex');
        hmac = new Buffer(hmac, 'hex');

        var decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(hmac);

        var decrypted = decipher.update(message, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }
};
