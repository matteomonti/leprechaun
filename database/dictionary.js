const sqlite3 = require('sqlite3').verbose();

module.exports = function(path, table)
{
    // Header

    var self = this;

    // Members

    var database = new sqlite3.Database(path);

    // Methods

    self.setup = function()
    {
        return run('create table x(a int, b int);');
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
}
