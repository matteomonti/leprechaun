var bigint = require('big-integer');

module.exports = function(database)
{
    // Self

    var self = this;

    // Members

    var queries = null;

    // Methods

    self.setup = async function()
    {
        await database.begin();
        await database.prun('drop table if exists globals;');
        await database.prun('create table globals(version text);');
        await database.prun('insert into globals values(\'0\')');
        await database.prun('drop table if exists updates;');
        await database.prun('create table updates(version char(64) primary key, payload text);');
        await database.prun('drop table if exists keychain;');
        await database.prun('create table keychain(user char(64) primary key, private text, iv text, tag text, hash text);');
        await database.commit();
    }

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
                        resolve(new bigint(row.version));
                    }
                });
            });
        },
        set: function(version)
        {
            prepare();
            version = version.toString();

            return new Promise(function(resolve, reject)
            {
                queries.version.set.run(version, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.update = {
        get: async function(version)
        {
            prepare();
            version = version.toString();

            return new Promise(function(resolve, reject)
            {
                queries.update.get.get(version, function(error, row)
                {
                    if(error)
                        reject(error);
                    else if(row)
                        resolve(JSON.parse(row.payload));
                    else
                        resolve(null);
                });
            });
        },
        add: async function(version, payload)
        {
            prepare();
            version = version.toString();

            return new Promise(function(resolve, reject)
            {
                queries.update.add.run(version, JSON.stringify(payload), function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    self.keychain = {
        get: async function(user)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.keychain.get.get(user, function(error, row)
                {
                    if(error)
                        reject(error);
                    else if(row)
                        resolve({private: {secret: row.private, iv: row.iv, tag: row.tag}, hash: row.hash});
                    else
                        resolve(null);
                });
            });
        },
        add: async function(user, keychain)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.keychain.add.run(user, keychain.private.secret, keychain.private.iv, keychain.private.tag, keychain.hash, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        },
        remove: async function(user)
        {
            prepare();
            return new Promise(function(resolve, reject)
            {
                queries.keychain.remove.run(user, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
    };

    // Private Methods

    var prepare = function()
    {
        if(!queries)
            queries = {
                version:
                {
                    get: database.prepare('select version from globals;'),
                    set: database.prepare('update globals set version = ?')
                },
                update:
                {
                    get: database.prepare('select payload from updates where version = ?;'),
                    add: database.prepare('insert into updates values(?, ?);')
                },
                keychain:
                {
                    get: database.prepare('select private, iv, tag, hash from keychain where user = ?;'),
                    add: database.prepare('insert into keychain values(?, ?, ?, ?, ?);'),
                    remove: database.prepare('delete from keychain where user = ?;')
                }
            }
    };
};
