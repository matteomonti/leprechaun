module.exports = function(hex, bit)
{
    byte = Math.floor(bit / 4);
    bit = bit % 4;

    binary = parseInt(hex[byte], 16).toString(2);
    binary = "0000".substr(binary.length) + binary;

    return parseInt(binary[bit]);
}
