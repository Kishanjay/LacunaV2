/**
 * Commandline entrypoint of LacunaJS
 */

'use strict';

require("./prototype_extension");
const logger = require("./_logger");
const lacuna = require("./lacuna_runner");
const commandLineArgs = require('command-line-args');

/* Default runOptions */
let runOptions = {
    // directory obviously has no default
    analyzer: null,
    entry: "index.html",
    destination: null,
    logfile: "lacuna.log",
    timeout: null,
    olevel: 0,
    force: false
};
/* Fetch runOptions from command line */
try {
    let argv = commandLineArgs([
        { name: 'directory', type: String, defaultOption: true }, // obviously has no default option
        { name: 'analyzer', type: String, multiple: true, alias: 'a' },

        { name: 'entry', type: String, alias: 'e' },
        { name: 'olevel', type: Number, alias: 'o' },

        { name: 'logfile', type: String, alias: 'l' },
        { name: 'timeout', type: Number, alias: 't' },
        { name: 'force', type: Boolean, alias: 'f' },

        { name: 'destination', type: String, alias: 'd' }
    ]);

    runOptions.extend(argv);
} catch (exception) { throw logger.error(exception); }
if (!runOptions) { throw logger.error("Invalid runOptions"); }

try {
    logger.silly("runOptions OK");
    lacuna.run(runOptions);
} catch (e) { console.log(e); }
