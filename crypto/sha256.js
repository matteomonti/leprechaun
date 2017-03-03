const crypto = require('crypto');

module.exports = function(message)
{
    return crypto.createHmac('sha256', message).digest('hex');
};
