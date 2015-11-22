var phantom = require('phantomjs-promise');
var Promise = require("bluebird");
var redis = require("redis");
var http = require('http');
var getenv = require('getenv');
var port, server, phantomJs, client;

Promise.promisifyAll(redis.RedisClient.prototype);

var redisPort = getenv('REDIS_PORT', 6379);
var redisHost = getenv('REDIS_HOST', 'localhost');
client = redis.createClient(redisPort, redisHost);

if (process.argv.length !== 3) {
    console.log('Usage: simpleserver.js <portnumber>');
    process.exit(1)
}

port = process.argv[2];

phantom.createAsync().then(function(phantom) {
    phantomJs = phantom;
});

server = http.createServer(requestHandler)
    .listen(port, function () {
        //Callback triggered when server is successfully listening. Hurray!
        console.log("Server listening on: http://localhost:%s", port);
    });

function requestHandler(request, response) {
    console.log('Request at ' + new Date());
    console.log(request.url);
    if (request.url != '/api/1.0/token/') {
        notFound(response);
        return;
    }

    var data = {};

    client.zremrangebyscoreAsync('ticket.token', 0, timestamp()).then(function() {
            var args2 = [ 'ticket.token', '+inf', '-inf', 'WITHSCORES', 'LIMIT', 0, 1];
            return client.zrevrangebyscoreAsync(args2);
        }).then(function (result) {
            if (result.length > 0) {
                data.token = result[0];
                return getSessionFromStorage(data.token).then(function(session) {
                    data.session = session;
                }).then();
            } else {
                return getPage();
            }
    }).then(function() {
        response.statusCode = 200;
        response.headers = {
            'Cache': 'no-cache',
            'Content-Type': 'application/json'
        };
        response.write(JSON.stringify(data));
        response.end();

    }).catch(function (e) {
        console.log(e);
        notFound(response);
    })
    .catch(function(e) {
        console.log(e);
    });

    function getPage() {
        return Promise.resolve(phantomJs).then(function (phantom) {
            return phantom.clearCookiesAsync();
        }).then(function (objects) {
                return objects.phantom.createPageAsync();
            })
            .then(function (objects) {
                return objects.page.setAsync('userAgent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/45.0.2454.101 Chrome/45.0.2454.101 Safari/537.36');
            })
            .then(function (objects) {
                return objects.page.openAsync("http://booking.uz.gov.ua/ru/");
            })
            .then(function (objects) {
                if (objects.ret[0] != "success") {
                    throw objects.ret[0].status;
                }
                console.log('success!!!!');
                return objects.page.evaluateAsync(function () {
                    var token = localStorage.getItem('gv-token');
                    localStorage.clear();
                    return token;
                });
            }).then(function (objects) {
                var token = objects.ret[0];
                if (!token) {
                    throw new Error('Can\'t fetch token');
                }
                data.token = token;
                console.log("token from promise" + token);
                return objects.page.getCookiesAsync();
            }).then(function (objects) {

                var cookies = objects.ret[0];
                for (var i in cookies) {
                    var name = cookies[i].name;
                    if (name == '_gv_sessid') {
                        var session = cookies[i].value;
                        break;
                    }
                }
                data.session = session;
                console.log("sessin from promise" + session);
                return objects;
            }).then(function (objects) {
                objects.page.close();
                return objects.phantom.clearCookies();
            })
            .then(storeToken)
            .then(storeSession)
            .then(setSessionExpire)
            .catch(function (e) {
                console.log(e);
            });
    }

    function storeToken() {
        var time = timestamp() + 60;
        console.log('store with: ' + time);
        return client.zaddAsync(['ticket.token', time, data.token]); // TTL - 60 sec
    }

    function storeSession() {
        console.log(data.session);
        return client.setAsync(getSessionKey(data.token), data.session);
    }

    function setSessionExpire() {
        return client.expireAsync(getSessionKey(data.token), 60);
    }
}

function getSessionKey(token) {
    return 'ticket.session.' + token;
}

function getSessionFromStorage(token) {
    return client.getAsync(getSessionKey(token));
}

function timestamp() {
    return Math.round(Date.now() / 1000);
}


function notFound (response, msg) {
    response.statusCode = 404;
    response.headers = {
        'Cache': 'no-cache',
        'Content-Type': 'application/json'
    };
    response.write(JSON.stringify({'msg':msg ? msg :'not found'}));
    response.end();
}

function createPhantom() {
    return phantom.createAsync().then(function (phantom) {
        return phantom.clearCookiesAsync();
    })
}