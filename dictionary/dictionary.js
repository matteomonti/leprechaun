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
        console.log('DICTIONARY ADD LOG');

        key = sha256(key);
        var response = {payload: {key: key, content: content}, root: {}, proof: {}};

        var depth = 0;
        var cursor = bigint.one;
        var collision = false;

        await db.begin();

        while(true)
        {
            console.log('cursor:', cursor.toString(16));
            var node;

            if(!depth)
            {
                console.log('on the root.');
                node = await db.get(cursor);
                console.log('node:', node);

                response.root.before = node.label;
                response.proof[cursor.toString(16)] = node;
            }
            else
            {
                console.log('not on the root.');

                var left = await db.get(cursor.divide(2).multiply(2));
                var right = await db.get(cursor.divide(2).multiply(2).add(1));

                console.log('left:', left, 'right:', right)

                node = bit(key, depth - 1) ? right : left;
                console.log('node:', node);

                if(!collision)
                {
                    console.log('there has been no collision yet.')

                    if(left)
                    {
                        console.log(cursor.divide(2).multiply(2).toString(16), '->', left);
                        response.proof[cursor.divide(2).multiply(2).toString(16)] = left;
                    }
                    if(right)
                    {
                        console.log(cursor.divide(2).multiply(2).add(1).toString(16), '->', right)
                        response.proof[cursor.divide(2).multiply(2).add(1).toString(16)] = right;
                    }
                }
            }

            if('key' in node)
            {
                if(node.key == key)
                    throw "Key collision.";

                console.log('collision.')
                collision = true;

                console.log('setting', cursor.toString(16), 'to', {label: null});
                await db.set(cursor, {label: null});

                console.log('setting', cursor.multiply(2).add(bit(node.key, depth)).toString(16), 'to', node);
                await db.set(cursor.multiply(2).add(bit(node.key, depth)), node);
            }
            else
            {
                console.log('just a node.')

                var child = await db.get(cursor.multiply(2).add(bit(key, depth)));
                console.log('child:', child);

                if(child)
                {
                    console.log('iterating, setting cursor to', cursor.multiply(2).add(bit(key, depth)).toString(16), 'and depth to', (depth + 1));
                    cursor = cursor.multiply(2).add(bit(key, depth));
                    depth++;
                }
                else
                {
                    if(!collision)
                    {
                        console.log('adding sibling to proof');
                        var sibling = await db.get(cursor.multiply(2).add(1 - bit(key, depth)).toString(16));
                        if(sibling)
                        {
                            console.log(cursor.multiply(2).add(1 - bit(key, depth)).toString(16), '->', sibling);
                            response.proof[cursor.multiply(2).add(1 - bit(key, depth)).toString(16)] = sibling;
                        }
                    }

                    console.log('inserting, setting', cursor.multiply(2).add(bit(key, depth)).toString(16), 'to', {label: sha256({key: key, content: content}), key: key, content: content});
                    await db.set(cursor.multiply(2).add(bit(key, depth)), {label: sha256({key: key, content: content}), key: key, content: content});
                    break;
                }
            }
        }

        console.log('recomputing merkle');

        while(!cursor.equals(0))
        {
            console.log('cursor:', cursor.toString(16));

            var node = await db.get(cursor);
            var left = await db.get(cursor.multiply(2)) || {label: null};
            var right = await db.get(cursor.multiply(2).add(1)) || {label: null};

            console.log('node:', node, 'left:', left, 'right:', right);

            node.label = sha256({left: left.label, right: right.label});
            console.log('node.label:', node.label);

            if(cursor.equals(1))
            {
                console.log('on the root, setting after');
                response.root.after = node.label;
            }

            console.log('setting', cursor.toString(16), 'to', node);
            await db.set(cursor, node);

            console.log('setting cursor to', cursor.divide(2).toString(16));
            cursor = cursor.divide(2);
        }

        await db.commit();

        console.log('--------------------------------');

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

    self.update = async function(key, content)
    {
        key = sha256(key);
        var response = {payload: {key: key, content: content}, root: {}, proof: {}};

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
                    await db.set(cursor, {label: sha256({key: key, content: content}), key: key, content: content});
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

            node.label = sha256({left: left.label, right: right.label});
            await db.set(cursor, node);

            if(cursor.equals(1))
                response.root.after = node.label;

            cursor = cursor.divide(2);
        }

        await db.commit();

        return response;
    };
};
