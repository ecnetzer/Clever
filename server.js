/**
 * Dependencies
 */
var express = require('express');
var serveStatic = require('serve-static');
var expressHbs = require('express-handlebars');

var session = require('express-session')
var request = require('request');
//

/**
 * Useful Constants
 */
var PORT = parseInt(process.env.PORT) || 5000;
var APP_URL = process.env.APP_URL || 'http://localhost:' + PORT;

var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;

var API_PREFIX = 'https://api.clever.com'
var OAUTH_TOKEN_URL = 'https://clever.com/oauth/tokens'

var OAUTH_TOKEN_REQ_PARAMS ={}
var ME_REQ_PARAMS

/**
 * App and middleware
 */
var app = express();
app.use(serveStatic(__dirname + '/public'));
app.engine('handlebars', expressHbs({helpers: { json: function (context) { return JSON.stringify(context);}}}));
app.set('view engine', 'handlebars');
app.use(session({secret: 'somekindasecret'}));
//

/**
 * A helper function to make external REST requests.
 * @param {hash} option - options hash passed to the request lib
 * @param {function} cb - A callback function with err, body as params
 */
var makeRequest = function (options, cb){
    request(options, function(err, response, body){
        if(!err){            
            if(response.statusCode != 200){
                var errorMsg = body['error'];
                console.error('Non-200 status code: ', response.statusCode, ' with error ' + errorMsg);
                cb(errorMsg);
            }else{            
                cb(null, body);
            }
        }else{
            console.error('Something broke: ' + err);            
            cb(err);
        }
    });
};

/**
 * Homepage
 */
app.get('/', function(req, res){
    res.render('index', {
        'redirect_uri': encodeURIComponent(APP_URL + '/oauth'),
        'client_id': CLIENT_ID,
        'district_id': '588cf0589490bd00018223f3'
    });    
});

/**
 * OAuth 2.0 endpoint
 */
app.get('/oauth', function(req, res){
    if(!req.query.code){
        res.redirect('/');
    }else{
        var body = {
            'code': req.query.code,
            'grant_type': 'authorization_code',
            'redirect_uri': APP_URL + '/oauth'
        };

        OAUTH_TOKEN_REQ_PARAMS = {
            'url': OAUTH_TOKEN_URL,
            'method': 'POST',
            'json': body,            
            'headers' : {
                'Authorization': 'Basic ' + new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            }
        };

        res.render('redirect', {
            'code': JSON.stringify(req.query.code, null, 2),
            'request_url': JSON.stringify(OAUTH_TOKEN_REQ_PARAMS.url, null, 2),
            'request_method': JSON.stringify(OAUTH_TOKEN_REQ_PARAMS.method, null, 2),
            'request_body': JSON.stringify(body, null, 2),
            'request_headers': JSON.stringify(OAUTH_TOKEN_REQ_PARAMS.headers, null, 2),
        });
    }
});

app.get('/oauth_step2', function(req, res){
    makeRequest(OAUTH_TOKEN_REQ_PARAMS, function(err, result){
        if(!err){
            var token = result['access_token'];
            ME_REQ_PARAMS = {
                'url': API_PREFIX + '/me',
                'json': true,
                'headers' : {
                    'Authorization': 'Bearer ' + token
                }
            };
            res.render('oauth_step2', {
                'response': JSON.stringify(result, null,2),
                'request_url': JSON.stringify(ME_REQ_PARAMS.url, null,2),
                'request_method': JSON.stringify(ME_REQ_PARAMS.method, null,2),
                'request_headers': JSON.stringify(ME_REQ_PARAMS.headers, null,2)
            });
        }else{
            console.error('Something broke: ' + err);
            res.status(500).send(err);
        }
    });
});

app.get('/me', function(req, res){
    makeRequest(ME_REQ_PARAMS, function(err, result){
        if(!err){
            res.render('me', {
                'response': JSON.stringify(result, null,2)
            });
        }else{
            console.error('Something broke: ' + err);
            res.status(500).send(err);
        }
    });
});

/**
 * A simple logout route.
 */
app.get('/logout', function(req, res){
    if(!req.session.user){
        res.redirect('/');  //If we're not logged in, redirect to the homepage
    }else{
        delete req.session.user;
        res.redirect('/');
    }    
});

/**
 * Fire up the server!
 */
app.listen(PORT, function() {
  console.log('Bell Schedule Demo now running on port ' + PORT);
});
