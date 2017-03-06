const bigint = require('big-integer');

const sha256 = require('../crypto/sha256.js');
const bit = require('./bit.js')

module.exports = {
    add: function(response)
    {
        response.payload.label = sha256({key: response.payload.key, content: response.payload.content});

        var depth = 0;
        var cursor = bigint.one;
        var collision = false;

        while(true)
        {
            var node = response.proof[cursor.toString(16)];

            if(!depth)
                if(node.label != response.root.before)
                    return false;

            if(depth > 0 && !collision)
            {
                var left;
                var right;

                if(bit(response.payload.key, depth - 1))
                {
                    left = response.proof[cursor.subtract(1).toString(16)] || {label: null};
                    right = node;
                }
                else
                {
                    left = node;
                    right = response.proof[cursor.add(1).toString(16)] || {label: null};
                }

                var parent = response.proof[cursor.divide(2).toString(16)];

                if(parent.label != sha256({left: left.label, right: right.label}))
                    return false;
            }

            if('key' in node)
            {
                if(!collision)
                {
                    collision = true;
                    if(node.label != sha256({key: node.key, content: node.content}))
                        return false;
                }

                response.proof[cursor.toString(16)] = {label: null};
                response.proof[cursor.multiply(2).add(bit(node.key, depth)).toString(16)] = node;
            }
            else
            {
                var child = response.proof[cursor.multiply(2).add(bit(response.payload.key, depth)).toString(16)];

                if(child)
                {
                    cursor = cursor.multiply(2).add(bit(response.payload.key, depth));
                    depth++;
                }
                else
                {
                    response.proof[cursor.multiply(2).add(bit(response.payload.key, depth)).toString(16)] = response.payload;
                    break;
                }
            }
        }

        while(!cursor.equals(0))
        {
            var node = response.proof[cursor.toString(16)];
            var left = response.proof[cursor.multiply(2).toString(16)] || {label: null};
            var right = response.proof[cursor.multiply(2).add(1).toString(16)] || {label: null};

            node.label = sha256({left: left.label, right: right.label});
            cursor = cursor.divide(2);
        }

        if(response.proof[bigint.one.toString(16)].label != response.root.after)
            return false;

        return true;
    }
}
