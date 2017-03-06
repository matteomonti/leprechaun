const bigint = require('big-integer');

const database = require('../database/dictionary.js');
const sha256 = require('../crypto/sha256.js');
const bit = require('./bit.js');

module.exports = function(path, table)
{
    // Self

    var self = this;

    // Members

    var db = new database(path, table);

    // Methods

    self.setup = async function()
    {
        await db.setup();
        await db.set(bigint.one, {label: sha256({left: null, right: null})});
    };

    self.add = async function(key, content)
    {
        key = sha256(key);
        var response = {payload: {key: key, content: content}, root: {}, proof: {}};

        var depth = 0;
        var cursor = bigint.one;
        var collision = false;

        await db.begin();

        while(true)
        {
            var node;

            if(!depth)
            {
                node = await db.get(cursor);

                response.root.before = node.label;
                response.proof[cursor.toString(16)] = node;
            }
            else
            {
                var left = await db.get(cursor.divide(2).multiply(2));
                var right = await db.get(cursor.divide(2).multiply(2).add(1));
                node = bit(key, depth - 1) ? right : left;

                if(!collision)
                {
                    if(left) response.proof[cursor.divide(2).multiply(2).toString(16)] = left;
                    if(right) response.proof[cursor.divide(2).multiply(2).add(1).toString(16)] = right;
                }
            }

            if('key' in node)
            {
                if(node.key == key)
                    throw "Key collision.";

                collision = true;

                await db.set(cursor, {label: null});
                await db.set(cursor.multiply(2).add(bit(node.key, depth)), node);
            }
            else
            {
                var child = await db.get(cursor.multiply(2).add(bit(key, depth)));

                if(child)
                {
                    cursor = cursor.multiply(2).add(bit(key, depth));
                    depth++;
                }
                else
                {
                    await db.set(cursor.multiply(2).add(bit(key, depth)), {label: sha256({key: key, content: content}), key: key, content: content});
                    break;
                }
            }
        }

        while(!cursor.equals(0))
        {
            var node = await db.get(cursor);
            var left = await db.get(cursor.multiply(2)) || {label: null};
            var right = await db.get(cursor.multiply(2).add(1)) || {label: null};

            node.label = sha256({left: left.label, right: right.label});

            if(cursor.equals(1))
                response.root.after = node.label;

            await db.set(cursor, node);
            cursor = cursor.divide(2);
        }

        await db.commit();

        return response;
    };

    self.remove = async function(key)
    {
        key = sha256(key);
        var response = {key: key, root: {}, proof: {}};

        var depth = 0;
        var cursor = bigint.one;

        await db.begin();

        while(true)
        {
            var node;

            if(!depth)
            {
                node = await db.get(cursor);

                response.root.before = node.label;
                response.proof[cursor.toString(16)] = node;
            }
            else
            {
                var left = await db.get(cursor.divide(2).multiply(2));
                var right = await db.get(cursor.divide(2).multiply(2).add(1));
                node = bit(key, depth - 1) ? right : left;

                if(!node)
                    throw "Node not found.";

                if(left) response.proof[cursor.divide(2).multiply(2).toString(16)] = left;
                if(right) response.proof[cursor.divide(2).multiply(2).add(1).toString(16)] = right;
            }

            if('key' in node)
            {
                if(node.key != key)
                    throw "Node not found.";
                else
                {
                    await db.remove(cursor);
                    cursor = cursor.divide(2);
                    break;
                }
            }
            else
            {
                cursor = cursor.multiply(2).add(bit(key, depth));
                depth++;
            }
        }

        while(!cursor.equals(0))
        {
            var node = await db.get(cursor);
            var left = await db.get(cursor.multiply(2)) || {label: null};
            var right = await db.get(cursor.multiply(2).add(1)) || {label: null};

            if(cursor.equals(1) || left.label || right.label)
            {
                node.label = sha256({left: left.label, right: right.label});
                await db.set(cursor, node);
            }
            else
                await db.remove(cursor);

            if(cursor.equals(1))
                response.root.after = node.label;

            cursor = cursor.divide(2);
        }

        await db.commit();

        return response;
    };

    self.get = async function(key)
    {
        key = sha256(key);
        var response = {proof: {}};

        var depth = 0;
        var cursor = bigint.one;
        
        await db.begin();

        while(true)
        {
            var node;

            if(!depth)
            {
                node = await db.get(cursor);

                response.root = node.label;
                response.proof[cursor.toString(16)] = node;
            }
            else
            {
                var left = await db.get(cursor.divide(2).multiply(2));
                var right = await db.get(cursor.divide(2).multiply(2).add(1));
                node = bit(key, depth - 1) ? right : left;

                if(!node)
                    throw "Node not found.";

                if(left) response.proof[cursor.divide(2).multiply(2).toString(16)] = left;
                if(right) response.proof[cursor.divide(2).multiply(2).add(1).toString(16)] = right;
            }

            if('key' in node)
            {
                if(node.key != key)
                    throw "Node not found.";
                else
                {
                    response.payload = node;
                    break;
                }
            }
            else
            {
                cursor = cursor.multiply(2).add(bit(key, depth));
                depth++;
            }
        }

        await db.commit();

        return response;
    }
};
