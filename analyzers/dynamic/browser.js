/*
	Wrapper for headless browser.
	Niels Groot Obbink
*/

'use strict';

// var phantomjs = require('phantomjs-prebuilt-that-works');
// var selenium = require('selenium-webdriver');
// var { logging } = require('selenium-webdriver');
const puppeteer = require('puppeteer');
const path = require("path");

const logger = require("../../_logger");

const express = require('express');
const app = express();
const port = 8012;

module.exports = function()
{
	this.browser = null;
	this.page = null;
	this.server = null;

	this.min_required_time = 2000;


	this.load = function(dir, entry, timeout)
	{
		this.server = app.listen(port, () => logger.info(`Analyzer[Dynamic] server@${port}`));
		app.use(express.static(dir));
		var url = "http://localhost:" + port + "/" + entry;
		
		return new Promise(async (resolve, reject) => {
			this.browser = await puppeteer.launch({headless: false}); // await
			this.page = await this.browser.newPage();
			
			var consoleLogs = [];
			this.page.on('console', msg => consoleLogs.push(msg.text()));

			await this.page.goto(url);

			if (!timeout) { timeout = 0; }
			// Wait at least min_required_time (browser startup time) seconds, more if we have a longer timeout.
			setTimeout(() => {
				resolve(consoleLogs);
			}, Math.max(timeout, this.min_required_time));
		});
	};


	this.stop = function()
	{
		this.browser.close();
		this.server.close();
	}
};
