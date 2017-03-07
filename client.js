/*const ursa = require('ursa');
var mykey = ursa.generatePrivateKey();

console.log(mykey.toPublicPem().toString());
console.log(mykey.toPrivatePem().toString());
*/

const aes256 = require('./crypto/aes256.js');

var my_cipher = new aes256('Emma Watson is the best!');
var secret = my_cipher.encrypt({awesome: true});
console.log(secret);

console.log(my_cipher.decrypt(secret));
