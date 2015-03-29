#! /usr/bin/env node
var express = require('express');
var phantom = require('phantom');
var spectre = require('commander');

spectre
    .version('0.1.0')
    .option('-c, --cache', 'Cache files to disk', false)
    .option('-p, --port [port]', 'Port to listen on', parseInt, 9090)
    .option('-h, --host [host]', 'The host to mirror', 'localhost:5000')
    .option('-t, --timeout [seconds]', 'The max amount of time to wait for a page to finish loading', parseInt, 10)
    .parse(process.argv);

var app = express();
var ignoredPaths = ['favicon.ico', '^/static/.+'];
var ignoreRegex = new RegExp(ignoredPaths.map(function(reg) { return '(' + reg + ')';}).join('|'));

var phantomParams = {
    parameters: {
        'load-images': false,
        'disk-cache': !!spectre.cache,
        'local-to-remote-url-access': true
    }
};

function getRenderedHtml(url, callback, page) {
    page.set('spectreTimeout', spectre.timeout);

    page.set('onResourceReceived', function(res) {
        if (res.status > 299 && res.status < 400) return;
        page.set('onResourceReceived', null);
        page.set('pageStatusCode', res.status);
    });

    page.set('onCallback', function() {
        page.get('content', function(content) {
            page.get('pageStatusCode', function(status) {
                page.close();
                callback(status || 200, content);
            });
        });
    });

    page.set('onLoadFinished', function() {
        page.evaluate(function(timeout) {
            setTimeout(window.callPhantom, timeout);
        }, undefined, spectre.timeout);
    });

    console.log('requesting url ' + url);
    page.open(url, function(status) {
        if (status === 'failed') {
            console.log('failed to fetch url ' + url);
            callback(500, '');
        }
    });
}

console.log('Spinning up phantomjs instance...');
phantom.create(phantomParams, function(ph) {
    app.get('*', function(req, resp) {
        var url = 'http://' + spectre.host + req.url;

        if (req.url.match(ignoreRegex) !== null) {
            console.log('Redirecting requested resource ' + req.url);
            return resp.redirect(url);
        }

        ph.createPage(getRenderedHtml.bind(this, url, function(status, body) {
            resp.status(status).send(body);
        }));
    });

    console.log('Starting server; listening on port ' + spectre.port + '...');
    app.listen(spectre.port);
});
