const bigint = require('big-integer');

const sha256 = require('../crypto/sha256.js');
const bit = require('./bit.js')

module.exports = {
    first: function()
    {
        return sha256({left: null, right: null});
    },
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
                var left = response.proof[cursor.divide(2).multiply(2).toString(16)] || {label: null};
                var right = response.proof[cursor.divide(2).multiply(2).add(1).toString(16)] || {label: null};
                var parent = response.proof[cursor.divide(2).toString(16)];

                if(parent.label != sha256({left: left.label, right: right.label}))
                    return false;
            }

            if('key' in node)
            {
                if(!collision)
                {
                    collision = true;

                    if(node.key == response.payload.key)
                        return false;

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
    },
    remove: function(response)
    {
        var depth = 0;
        var cursor = bigint.one;

        while(true)
        {
            var node = response.proof[cursor.toString(16)];

            if(!depth)
            {
                if(node.label != response.root.before)
                    return false;
            }
            else
            {
                var left = response.proof[cursor.divide(2).multiply(2).toString(16)] || {label: null}
                var right = response.proof[cursor.divide(2).multiply(2).add(1).toString(16)] || {label: null};
                var parent = response.proof[cursor.divide(2).toString(16)];

                if(parent.label != sha256({left: left.label, right: right.label}))
                    return false;
            }

            if('key' in node)
            {
                if(node.label != sha256({key: node.key, content: node.content}))
                    return false;

                if(node.key != response.key)
                    return false;

                response.proof[cursor.toString(16)] = null;
                cursor = cursor.divide(2);
                break;
            }

            cursor = cursor.multiply(2).add(bit(response.key, depth));
            depth++;
        }

        while(!cursor.equals(0))
        {
            var node = response.proof[cursor.toString(16)];
            var left = response.proof[cursor.multiply(2).toString(16)] || {label: null};
            var right = response.proof[cursor.multiply(2).add(1).toString(16)] || {label: null};

            if(cursor.equals(1) || left.label || right.label)
                node.label = sha256({left: left.label, right: right.label});
            else
                response.proof[cursor.toString(16)] = null;

            cursor = cursor.divide(2);
        }

        if(response.proof[bigint.one.toString(16)].label != response.root.after)
            return false;

        return true;
    },
    get: function(response)
    {
        var depth = 0;
        var cursor = bigint.one;

        while(true)
        {
            var node = response.proof[cursor.toString(16)];

            if(!depth)
            {
                if(node.label != response.root)
                    return false;
            }
            else
            {
                var left = response.proof[cursor.divide(2).multiply(2).toString(16)] || {label: null}
                var right = response.proof[cursor.divide(2).multiply(2).add(1).toString(16)] || {label: null};
                var parent = response.proof[cursor.divide(2).toString(16)];

                if(parent.label != sha256({left: left.label, right: right.label}))
                    return false;
            }

            if('key' in node)
            {
                if(node.label != sha256({key: node.key, content: node.content}))
                    return false;

                break;
            }

            cursor = cursor.multiply(2).add(bit(response.payload.key, depth));
            depth++;
        }

        if(response.proof[cursor.toString(16)].label != response.payload.label)
            return false;

        if(response.payload.label != sha256({key: response.payload.key, content: response.payload.content}))
            return false;

        return true;
    },
    update: function(response)
    {
        var before;

        var depth = 0;
        var cursor = bigint.one;

        response.payload.label = sha256({key: response.payload.key, content: response.payload.content});

        while(true)
        {
            var node = response.proof[cursor.toString(16)];

            if(!depth)
            {
                if(node.label != response.root.before)
                    return false;
            }
            else
            {
                var left = response.proof[cursor.divide(2).multiply(2).toString(16)] || {label: null}
                var right = response.proof[cursor.divide(2).multiply(2).add(1).toString(16)] || {label: null};
                var parent = response.proof[cursor.divide(2).toString(16)];

                if(parent.label != sha256({left: left.label, right: right.label}))
                    return false;
            }

            if('key' in node)
            {
                if(node.label != sha256({key: node.key, content: node.content}))
                    return false;

                if(node.key != response.payload.key)
                    return false;

                before = response.proof[cursor.toString(16)];
                response.proof[cursor.toString(16)] = response.payload;
                cursor = cursor.divide(2);
                break;
            }

            cursor = cursor.multiply(2).add(bit(response.payload.key, depth));
            depth++;
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

        return {before: before, after: response.payload};
    }
}
