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
const logger = require("./_logger");
const lacunizer = require("./_lacunizer");

const commandLineArgs = require('command-line-args'),
    fs = require('fs-extra'),
    path = require('path'),
    Confirm = require('prompt-confirm');

const lacunaSettings = require("./_settings");

/* Default runOptions */
let runOptions = {
    analyzer: null,
    entry: "index.html",
    destination: null,
    verbose: false,
    logfile: "lacuna.log",
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
verifyRunOptions(runOptions)
    .catch((verifyError) => { process.exit(1); })
    .then((result) => {
        logger.verbose("runOptions verified");

        /* If a different destination is chosen, copy current directory content */
        if (runOptions.destination && (runOptions.destination != runOptions.directory)) {
            fs.copySync(runOptions.directory, runOptions.destination);
            
            // the rest of the script will be using this param
            runOptions.directory = runOptions.destination;
        }

        /* Startup lacuna */
        logger.info("runOptions: " + JSON.stringify(runOptions));
        logger.info("Starting Lacuna");

        // RUN
        try {
            var { callGraph, analyzerResults } = lacunizer.run(runOptions);

            /* built log file */
            var lacuna_log = {
                runDate: new Date(),
                runOptions: runOptions,
                analyzerResults: analyzerResults,
                graphStats: callGraph.getStatistics(),
                deadFunctions: callGraph.getDisconnectedNodes(),
                aliveFunctions: callGraph.getConnectedNodes(),
                allFunctions: callGraph.nodes,
                // files: callGraph.rootNodes
            };
            
            /* write log */
            var logPath = path.join(runOptions.directory, runOptions.logfile);
            fs.writeFileSync(logPath, JSON.stringify(lacuna_log, null, 4), 'utf8');

            var DOTLogPath = logPath + ".dot";
            fs.writeFileSync(DOTLogPath, callGraph.getDOT(), 'utf8');

            
            
        } catch (error) {
            console.log("Catch run");
            console.log(error);
        }
    })
    .catch((error) => { return logger.error(error); });



/**
 * Big function that verifies most of the runOptions
 *  - Verify directory: should be a valid directory
 *  - Verify analyzer: should be an existing analyzer
 *  - Verify entryfile: should be an existing file
 *  - Verify optimization level: should be in the expected range
 * @param runOptions
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
        var analyzerPath = path.join(lacunaSettings.ANALYZERS_DIR, analyzer) + ".js";
        if (!fs.existsSync(analyzerPath)) {
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
    if (!lacunaSettings.OPTIMIZATION_LEVELS.includes(runOptions.olevel)) {
        throw logger.error("Invalid optimizationlevel: " + runOptions.olevel);
    }
    logger.silly("runOptions.olevel OK");

    // <Shant be necessary>
    /* Verify runOptions.logfile */
    /* Verify runOptions.verbose */
    /* Verify runOptions.timeout */
    /* Verify runOptions.force */

    /* Verify runOptions.destination */
    if (runOptions.destination && fs.existsSync(runOptions.destination)) {
        if (!runOptions.force) {
            var answer = await prompt(`Warning "${runOptions.destination}" already exists, are you sure you want to overwrite?`);
            if (!answer || answer != true) { process.exit(1); }        
        }
        logger.verbose(`Overwriting output ${runOptions.destination}`);
    }
    logger.silly("runOptions.destination OK");
}

function prompt(msg) {
    return new Confirm(msg).run();
}