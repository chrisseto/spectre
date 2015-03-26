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
        'disk-cache': spectre.cache,
        'local-to-remote-url-access': true
    }
};

function getRenderedHtml(url, callback, page) {
    var status = 200;

    page.onResourceReceived = function(res) {
        if (res.status > 299 && res.status < 400) return;
        status = res.status;
        page.onResourceReceived = null;
    };

    page.onInitialized = function() {
        page.evaluate(function() {
            setTimeout(window.callPhantom(), spectre.timeout);
        });
    };

    page.onCallback = function() {
        callback(status, page.content);
        page.close();
    };

    page.open(url);
}

console.log('Spinning up phantomjs instance...');
phantom.create(phantomParams, function(ph) {
    app.get('*', function(req, resp) {
        if (req.url.match(ignoreRegex) !== null)
            return resp.redirect(host + req.url);

        var url = spectre.host + resp.url;
        ph.createPage(getRenderedHtml.bind(this, url, resp.send));
    });

    console.log('Starting server; listening on port ' + spectre.port + '...');
    app.listen(spectre.port);
});