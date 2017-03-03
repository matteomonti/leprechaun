const sqlite3 = require('sqlite3').verbose();

module.exports = function(path, table)
{
    // Header

    var self = this;

    // Members

    var database = new sqlite3.Database(path);

    var queries = {
        begin: database.prepare('begin;'),
        commit: database.prepare('commit;'),
        get: database.prepare('select payload from ' + table + ' where id = ?;'),
        insert: database.prepare('insert into ' + table + '(id, payload) values(?, ?);'),
        delete: database.prepare('delete from ' + table + ' where id = ?;')
    };

    // Methods

    self.setup = async function()
    {
        await run('drop table if exists ' + table + ';');
        await run('create table ' + table + '(id char(64) primary key, payload text);');
    }

    // Private Methods

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
    }

    self.get = function(id)
    {
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
        return new Promise(function(resolve, reject)
        {
            queries.begin.run(function(error)
            {
                if(error)
                    reject(error);
                else
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
                                    queries.commit.run(function(error)
                                    {
                                        if(error)
                                            reject(error);
                                        else
                                            resolve();
                                    });
                            });
                    });
            });
        });
    };
}
