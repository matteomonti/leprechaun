var aes = require('./crypto/aes.js');

var key = '12345678901234567890123456789045';
var iv = '123456789012345678901234';

var cryptoso = aes.encrypt({awesome: true}, key, iv);
var decryptoso = aes.decrypt(cryptoso.message, key, iv, cryptoso.hmac);

console.log(decryptoso);
