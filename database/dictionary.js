module.exports = function(database, table)
{
    // Self

    var self = this;

    // Members

    var queries = null;

    // Forwards

    self.begin = database.begin;
    self.commit = database.commit;

    // Methods

    self.setup = async function()
    {
        await database.begin();
        await database.prun('drop table if exists ' + table + ';');
        await database.prun('create table ' + table + '(id char(64) primary key, payload text);');
        await database.commit();
    };

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
            database.begin().then(function()
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
                                database.commit().then(resolve).catch(reject);
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
                get: database.prepare('select payload from ' + table + ' where id = ?;'),
                insert: database.prepare('insert into ' + table + '(id, payload) values(?, ?);'),
                delete: database.prepare('delete from ' + table + ' where id = ?;')
            }
    };
};
