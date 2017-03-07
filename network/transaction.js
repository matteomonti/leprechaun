const net = require('net');
const jsocket = require('json-socket');

module.exports = function(endpoint, body)
{
    return new Promise(function(resolve, reject)
    {
        var connection = {raw: new net.Socket()};
        connection.json = new jsocket(connection.raw);

        connection.json.connect(endpoint.port, endpoint.host);

        var error;
        var rejected = false;
        var success = false;

        var wipe = function()
        {
            try
            {
                connection.raw.destroy();
                queue = null;

                if(callback)
                    callback();

                if(success)
                    return;

                if(!rejected)
                    reject(error);

                rejected = true;
            }
            catch(error)
            {
            }
        };

        connection.raw.setTimeout(60000);
        connection.raw.on('timeout', wipe);
        connection.raw.on('error', wipe);
        connection.raw.on('close', wipe);
        connection.raw.on('end', wipe);

        var queue = [];
        var callback = null;

        connection.json.on('connect', function()
        {
            connection.interface = {
                send: function(message)
                {
                    connection.json.sendMessage(message);
                },
                receive: function()
                {
                    return new Promise(function(rresolve, rreject)
                    {
                        callback = function()
                        {
                            if(!queue)
                                rreject();

                            var message = queue[0];
                            queue = queue.slice(1);

                            callback = null;
                            rresolve(message);
                        };

                        if(queue.length)
                            callback();
                    });
                }
            };

            connection.json.on('message', function(message)
            {
                queue.push(message);

                if(callback)
                    callback();
            });

            body(connection.interface).then(function(response)
            {
                success = true;
                wipe();
                resolve(response);
            }).catch(function(error)
            {
                reject(error);
                rejected = true;

                wipe();
            });
        });
    });
}
