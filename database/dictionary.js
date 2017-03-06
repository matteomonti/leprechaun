module.exports = function(database, table)
{
    // Self

    var self = this;

    // Members

    var nesting = 0;

    var queries = null;

    // Methods

    self.setup = async function()
    {
        await run('drop table if exists ' + table + ';');
        await run('create table ' + table + '(id char(64) primary key, payload text);');
    };

    self.begin = function()
    {
        prepare();

        return new Promise(function(resolve, reject)
        {
            nesting++;

            if(nesting > 1)
                resolve();
            else
                queries.begin.run(function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
        });
    }

    self.commit = function()
    {
        prepare();

        return new Promise(function(resolve, reject)
        {
            nesting--;

            if(nesting > 0)
                resolve();
            else
                queries.commit.run(function(error)
                {
                    if(error)
                        reject(error);
                    else
                        resolve();
                });
        });
    }

    self.get = function(id)
    {
        prepare();

        id = id.toString(16);
        return new Promise(function(resolve, reject)
        {
            queries.get.get(id, function(error, row)
            {
                if(error)
                    reject(error);
                else if(row)
                    resolve(JSON.parse(row.payload));
                else
                    resolve(null);
            });
        });
    };

    self.set = function(id, payload)
    {
        prepare();

        id = id.toString(16);
        return new Promise(function(resolve, reject)
        {
            self.begin().then(function()
            {
                queries.delete.run(id, function(error)
                {
                    if(error)
                        reject(error);
                    else
                        queries.insert.run(id, JSON.stringify(payload), function(error)
                        {
                            if(error)
                                reject(error);
                            else
                                self.commit().then(resolve).catch(reject);
                        });
                });
            }).catch(reject);
        });
    };

    self.remove = function(id)
    {
        prepare();

        id = id.toString(16);
        return new Promise(function(resolve, reject)
        {
            queries.delete.run(id, function(error)
            {
                if(error)
                    reject(error);
                else
                    resolve();
            });
        });
    };

    // Private Methods

    var prepare = function()
    {
        if(!queries)
            queries = {
                begin: database.prepare('begin;'),
                commit: database.prepare('commit;'),
                get: database.prepare('select payload from ' + table + ' where id = ?;'),
                insert: database.prepare('insert into ' + table + '(id, payload) values(?, ?);'),
                delete: database.prepare('delete from ' + table + ' where id = ?;')
            }
    };

    var run = function(query)
    {
        return new Promise(function(resolve, reject)
        {
            database.run(query, function(error)
            {
                if(error)
                    reject(error);
                else
                    resolve();
            });
        });
    };
};
