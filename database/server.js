module.exports = function(database)
{
    // Self

    var self = this;

    // Members

    var queries = null;

    // Methods

    self.setup = async function()
    {
        await run('drop table if exists globals;')
        await run('create')
    }

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
