const crypto = require('crypto');

const sha256 = require('./sha256.js');

const algorithm = 'aes-256-gcm';

module.exports = function(key)
{
    // Self

    var self = this;

    // Members

    key = sha256(key, 'buffer');
    var hash = sha256(key);

    // Getters

    self.hash = function()
    {
        return hash;
    };

    // Methods

    self.encrypt = function(message)
    {
        message = JSON.stringify(message);
        var iv = crypto.randomBytes(12);

        var cipher = crypto.createCipheriv(algorithm, key, iv);
        var encrypted = cipher.update(message, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        var tag = cipher.getAuthTag().toString('hex');
        return {iv: iv.toString('hex'), tag: tag, secret: encrypted};
    };

    self.decrypt = function(message)
    {
        var iv = new Buffer(message.iv, 'hex');
        var tag = new Buffer(message.tag, 'hex');

        var decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(tag);

        var decrypted = decipher.update(message.secret, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }
};
