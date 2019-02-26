/**
 * Entrypoint of LacunaJS
 * 
 * @author
 * Kishan Nirghin
 * 
 * @description
 * This file is mainly responsible for parsing all commandline arguments
 * The real logic of lacuna is implemented in lacunizer.js
 */

'use strict';

require("./prototype_extension");
const logger = require("./logger");

const commandLineArgs = require('command-line-args'),
    fs = require('fs-extra'),
    path = require('path'),
    Confirm = require('prompt-confirm');


const ANALYZERS_DIR = "analyzers";
const OPTIMIZATION_LEVELS = [
    0, // do not replace anything, leaves source-code intact
    1, // replace functions with lazy loading mechanism
    2, // replace functions with empty functions
    3, // replace functions with null
    4, // remove function reference entirely
];

/* Default runOptions */
let runOptions = {
    analyzer: null,
    entry: "index.html",
    destination: null,
    verbose: false,
    logfile: "lacuna_log.json",
    timeout: null,
    olevel: 0,
    force: false
};
/* Fetch runOptions from command line */
try {
    let argv = commandLineArgs([
        { name: 'directory', type: String, defaultOption: true },
        { name: 'analyzer', type: String, multiple: true, alias: 'a' },

        { name: 'entry', type: String, alias: 'e' },
        { name: 'olevel', type: Number, alias: 'o' },

        { name: 'logfile', type: String, alias: 'l' },
        { name: 'verbose', type: Boolean, alias: 'v' },
        { name: 'timeout', type: Number, alias: 't' },
        { name: 'force', type: Boolean, alias: 'f' },

        { name: 'destination', type: String, alias: 'd' }
    ]);

    runOptions.extend(argv);
} catch (exception) { throw logger.error(exception); }
if (!runOptions) { throw logger.error("Invalid runOptions"); }
logger.silly("runOptions OK");

/* Verify all runtime options */
verifyRunOptions(runOptions).then((result) => {
    logger.verbose("runOptions verified");

    /* Change directory to destination after copy */
    if (runOptions.destination && (runOptions.destination != runOptions.directory)) {
        fs.copySync(runOptions.directory, runOptions.destination);

        runOptions.originalDirectory = runOptions.directory;
        runOptions.directory = runOptions.destination;
    }

    /* Startup lacuna */
    logger.info("runOptions: " + JSON.stringify(runOptions));
    logger.info("Starting Lacuna");
});



/**
 * Big function that only verifies the runOptions
 * @param {*} runOptions 
 */
async function verifyRunOptions(runOptions) {
    /* Verify runOptions.directory */
    if (!runOptions.directory ||
        !fs.existsSync(runOptions.directory) ||
        !fs.lstatSync(runOptions.directory).isDirectory()) {
        throw logger.error("Invalid directory: " + runOptions.directory);
    }
    logger.silly("runOptions.directory OK");

    /* Verify runOptions.analyzer */
    if (!runOptions.analyzer || runOptions.analyzer.length <= 0) {
        throw logger.error("Invalid analyzer: " + runOptions.analyzer);
    }
    runOptions.analyzer.forEach((analyzer) => {
        var analyzerPath = path.join(ANALYZERS_DIR, analyzer) + ".js";
        if (!fs.existsSync(analyzerPath)) {
            logger.error("Analyzer does not exist: " + analyzerPath);
            throw logger.error("Invalid analyzer: " + analyzer);
        }
    });
    logger.silly("runOptions.analyzer OK");

    /* Verify runOptions.entry */
    if (!runOptions.entry) {
        throw logger.error("Invalid entryFile: " + runOptions.entry);
    }
    let entryPath = path.join(runOptions.directory, runOptions.entry);
    if (!fs.existsSync(entryPath)) {
        throw logger.error("Entry file does not exist: " + entryPath);
    }
    logger.silly("runOptions.entry OK");

    /* Verify runOptions.olevel */
    if (!OPTIMIZATION_LEVELS.includes(runOptions.olevel)) {
        throw logger.error("Invalid optimizationlevel: " + runOptions.olevel);
    }
    logger.silly("runOptions.olevel OK");

    // <Shant be necessary>
    /* Verify runOptions.logfile */
    /* Verify runOptions.verbose */
    /* Verify runOptions.timeout */
    /* Verify runOptions.force */

    /* Verify runOptions.destination */
    if (runOptions.destination &&
        fs.existsSync(runOptions.destination) &&
        !runOptions.force) {
        var answer = await prompt(`Warning "${runOptions.destination}" already exists, are you sure you want to overwrite?`);
        if (!answer || answer != true) { process.exit(1); }        
    }
    logger.silly("runOptions.destination OK");
}

function prompt(msg) {
    return new Confirm(msg).run();
}