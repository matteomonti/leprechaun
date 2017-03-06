const sqlite3 = require('sqlite3').verbose();

module.exports = {
    open: function(path)
    {
        // Closure

        var database = new sqlite3.Database(path);
        var queries = null;
        var nesting = 0;
        
        // Methods

        database.begin = function()
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
        };

        database.commit = function()
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
        };

        database.prun = function(query)
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

        // Private methods

        var prepare = function()
        {
            if(!queries)
                queries = {
                    begin: database.prepare('begin;'),
                    commit: database.prepare('commit;'),
                }
        };

        return database;
    }
};
