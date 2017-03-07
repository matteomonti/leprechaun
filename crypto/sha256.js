const objecthash = require('node-object-hash');

var hasher = objecthash({sort: true, coerce: false});

module.exports = function(message, encoding)
{
    return hasher.hash(message, {enc: encoding});
};
