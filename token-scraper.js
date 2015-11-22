var port, server, service,
    system = require('system');

if (system.args.length !== 2) {
    console.log('Usage: simpleserver.js <portnumber>');
    phantom.exit(1);
} else {
    port = system.args[1];
    server = require('webserver').create();

    var notFound = function(response, msg) {
        response.statusCode = 404;
        response.headers = {
            'Cache': 'no-cache',
            'Content-Type': 'application/json'
        };
        response.write(JSON.stringify({'msg':msg ? msg :'not found'}));
        response.close();
    };
    service = server.listen(port, function (request, response) {

        if (request.url != '/api/1.0/token/') {
            notFound(response);
            return;
        }
        console.log('Request at ' + new Date());
        console.log(JSON.stringify(request, null, 4));


        phantom.clearCookies();
        var page = require('webpage').create();
        page.onError = function(msg, trace) {
            var msgStack = ['PHANTOM ERROR: ' + msg];
            if (trace && trace.length) {
                msgStack.push('TRACE:');
                trace.forEach(function(t) {
                    msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
                });
            }
            console.error(msgStack.join('\n'));
            notFound(response, msgStack.join('\n'));
            page.clearCookies();
        };

        page.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/45.0.2454.101 Chrome/45.0.2454.101 Safari/537.36';
        page.open('http://booking.uz.gov.ua/ru/', function (status) {
            if (status !== 'success') {
                console.log('Unable to access network');
                notFound(response);
            } else {
                var token = page.evaluate(function () {
                    return  localStorage.getItem('gv-token');
                });
                console.log(token);
                var session = '';
                var cookies = page.cookies;
                for(var i in cookies) {
                    var name = cookies[i].name;
                    if (name == '_gv_sessid')
                    {
                        session = cookies[i].value;
                        console.log(cookies[i].value);
                    }
                }
                response.statusCode = 200;
                response.headers = {
                    'Cache': 'no-cache',
                    'Content-Type': 'application/json'
                };
                response.write(JSON.stringify({'token':token,'session':session}));
                response.close();
                page.clearCookies();
            }
        });
    });

    if (service) {
        console.log('Web server running on port ' + port);
    } else {
        console.log('Error: Could not create web server listening on port ' + port);
        phantom.exit();
    }
}