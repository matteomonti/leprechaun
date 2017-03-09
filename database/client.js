const bigint = require('big-integer');

const database = require('./database.js');

module.exports = function(path)
{
    // Self

    var self = this;

    // Members

    var db = database.open(path);
    var queries = null;

    // Forwards

    self.begin = db.begin;
    self.commit = db.commit;

    // Methods

    self.setup = async function()
    {
        await db.begin();
        await db.prun('drop table if exists globals;');
        await db.prun('create table globals(user text, password text, public text, private text, root text, version text, last text);');
        await db.prun('insert into globals values(\'\', \'\', \'\', \'\', \'\', \'0\', \'0\')');
        await db.prun('drop table if exists proof;');
        await db.prun('create table proof(id char(64) primary key, payload text);');
        await db.commit();
    };

    self.user = {
        get: function()
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.user.get.get(function(error, row)
                {
                    if(error)
                        reject(error);
                    else
                    {
                        queries.user.get.reset();
                        resolve(row.user);
                    }
                });
            });
        },
        set: function(user)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.user.set.run(user, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.password = {
        get: function()
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.password.get.get(function(error, row)
                {
                    if(error)
                        reject(error);
                    else
                    {
                        queries.password.get.reset();
                        resolve(row.password);
                    }
                });
            });
        },
        set: function(password)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.password.set.run(password, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.public = {
        get: function()
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.public.get.get(function(error, row)
                {
                    if(error)
                        reject(error);
                    else
                    {
                        queries.public.get.reset();
                        resolve(row.public);
                    }
                });
            });
        },
        set: function(public)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.public.set.run(public, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.private = {
        get: function()
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.private.get.get(function(error, row)
                {
                    if(error)
                        reject(error);
                    else
                    {
                        queries.private.get.reset();
                        resolve(row.private);
                    }
                });
            });
        },
        set: function(private)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.private.set.run(private, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.root = {
        get: function()
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.root.get.get(function(error, row)
                {
                    if(error)
                        reject(error);
                    else
                    {
                        queries.root.get.reset();
                        resolve(row.root);
                    }
                });
            });
        },
        set: function(root)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.root.set.run(root, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.version = {
        get: function()
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.version.get.get(function(error, row)
                {
                    if(error)
                        reject(error);
                    else
                    {
                        queries.version.get.reset();
                        resolve(bigint(row.version));
                    }
                });
            });
        },
        set: function(version)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.version.set.run(version.toString(), function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.last = {
        get: function()
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.last.get.get(function(error, row)
                {
                    if(error)
                        reject(error);
                    else
                    {
                        queries.last.get.reset();
                        resolve(bigint(row.last));
                    }
                });
            });
        },
        set: function(last)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.last.set.run(last.toString(), function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.proof = {
        get: function(id)
        {
            if(typeof(id) != 'string')
                id = id.toString(16);

            prepare();

            return new Promise(function(resolve, reject)
            {
                queries.proof.get.get(id, function(error, row)
                {
                    if(error)
                        reject(error);
                    else if(!row)
                        resolve(null);
                    else
                        resolve(JSON.parse(row.payload));
                });
            });
        },
        set: function(id, payload)
        {
            if(typeof(id) != 'string')
                id = id.toString(16);

            if(typeof(payload) != 'string')
                payload = JSON.stringify(payload);

            prepare();

            return new Promise(function(resolve, reject)
            {
                queries.proof.remove.run(id, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        queries.proof.add.run(id, payload, function(error)
                        {
                            if(error)
                                reject(error);
                            else
                                resolve();
                        });
                });
            });
        },
        remove: function(id)
        {
            if(typeof(id) != 'string')
                id = id.toString(16);

            prepare();

            return new Promise(function(resolve, reject)
            {
                queries.proof.remove.run(id, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    // Private methods

    var prepare = function()
    {
        if(!queries)
            queries = {
                user:
                {
                    get: db.prepare('select user from globals;'),
                    set: db.prepare('update globals set user = ?;')
                },
                password:
                {
                    get: db.prepare('select password from globals;'),
                    set: db.prepare('update globals set password = ?;')
                },
                public:
                {
                    get: db.prepare('select public from globals;'),
                    set: db.prepare('update globals set public = ?')
                },
                private:
                {
                    get: db.prepare('select private from globals;'),
                    set: db.prepare('update globals set private = ?;')
                },
                root:
                {
                    get: db.prepare('select root from globals;'),
                    set: db.prepare('update globals set root = ?;')
                },
                version:
                {
                    get: db.prepare('select version from globals;'),
                    set: db.prepare('update globals set version = ?;')
                },
                last:
                {
                    get: db.prepare('select last from globals;'),
                    set: db.prepare('update globals set last = ?;')
                },
                proof:
                {
                    get: db.prepare('select payload from proof where id = ?;'),
                    add: db.prepare('insert into proof values(?, ?);'),
                    remove: db.prepare('delete from proof where id = ?;')
                }
            };
    };
};
