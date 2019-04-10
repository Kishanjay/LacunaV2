/** 
 * @author
 * Kishan Nirghin
 * 
 * @description
 * This file retrieves the functions of the project
 * Creates a graph with nodes representing these functions
 * Executes the different analyzers of Lacuna on the projects
 * Creates the edges in the graph
 * 
 * Outputs information regarding the functions
 */

const path = require("path");
const logger = require("./_logger");

const JsEditor = require("./js_editor"),
    HTMLEditor = require("./html_editor"),
    CallGraph = require("./call_graph"),
    LazyLoader = require("./lacuna_lazyloader");

const lacunaSettings = require("./_settings");

/**
 * Does the actual execution
 */
function run(runOptions, onFinish) {
    /* Creates the complete callgraph using the analyzers */
    createCompleteCallGraph(runOptions, (callGraph, analyzerResults) => {

        /* After the callgraph is completed, remove the dead functions from their files */
        optimizeFiles(runOptions, callGraph);

        /* Once that is finished, do the callback */
        onFinish(callGraph, analyzerResults);
    });
}

/**
 * Removes deadfunctions (partially) from their corresponding files
 * Also inserts the lazy loading functionality when needed.
 */
function optimizeFiles(runOptions, callGraph) {
    if (runOptions.olevel == 0) { return; }
    var deadFunctions = callGraph.getDisconnectedNodes(true);
    var deadFunctionsByFile = groupDeadFunctionsByFile(deadFunctions);

    var lazyLoader = new LazyLoader();
    for(var file in deadFunctionsByFile) { 
        if (!deadFunctionsByFile.hasOwnProperty(file)) { continue; }
        
        var deadFunctions = deadFunctionsByFile[file];
        removeFunctionsFromFile(deadFunctions, file, runOptions.olevel, lazyLoader);
    }

    /* After all functions are replaced with lazyload */
    if (runOptions.olevel == 1) {
        lazyLoader.exportServer(runOptions.directory);
    }
}

function removeFunctionsFromFile(functions, file, optimizationLevel, lazyLoader) {
    var extension = path.extname(file);
    if (!([".ts", ".js"].includes(extension))) {
        return logger.warn(`Could not optimize ${file}`);
    }
    var jse = new JsEditor().loadFile(file);
    var removeFunction = null;

    if (optimizationLevel == 1) {
        jse.insert(lazyLoader.getLazyLoadFrame());

        removeFunction = (deadFunction) => {
            var lazyLoadReplacement = lazyLoader.getLazyLoadReplacement(deadFunction);
            var functionBody = jse.replaceFunction(deadFunction, lazyLoadReplacement);
            lazyLoader.add(deadFunction, functionBody);
        }
    }
    if (optimizationLevel == 2) { // empty body
        removeFunction = (deadFunction) => {
            jse.replaceFunction(deadFunction, "");
        };
    }
    if (optimizationLevel == 3) { // replace with null    
        removeFunction = (deadFunction) => {
            jse.removeFunction(deadFunction);
        };
    }
    
    functions.forEach(deadFunction => {
        removeFunction(deadFunction);
    });
    
    jse.saveFile();
}

/**
 * The functionality that creates the entire callGraph
 * Part 1: it creates the empty callgraph with only the nodes (which represent
 * functions) by fetching all script data from the entry file; from which it 
 * will fetch all functions and insert these as nodes in the callgraph.
 * 
 * Part 2: it will run every chosen analyzer on the sourceFolder that will 
 * mark the different nodes as alive by creating edges in the callgraph.
 * 
 * Part 3: once every analyzer is done, we can assume that the callgraph is
 * completed.
 * 
 * @returns callback(onCallGraphComplete)
 * @param callGraph contains the entire callgraph object
 * @param analyzerResults contains information about which edges were 
 * drawn by which analyzer
 */
function createCompleteCallGraph(runOptions, onCallGraphComplete) {
    /* Part 1: creating the edgeless callgraph, with every function as a node */
    var scripts = retrieveScripts(path.join(runOptions.directory, runOptions.entry));
    var functions = retrieveFunctions(scripts);
    logger.debug(`Inserting [${functions.length}/${scripts.length}] nodes`);
    var callGraph = new CallGraph(functions);

    /* Part 2: running every analyzer to create edges in the callgraph */
    var analyzerResults = [];
    var analyzers = retrieveAnalyzers(runOptions.analyzer);
    var analyzersCompleted = {};
    analyzers.forEach((analyzer) => {
        analyzersCompleted[analyzer.name] = false;
        try {
            analyzer.object.run(runOptions, callGraph, scripts, onAnalyzerDone);
        }
        catch (error) {
            logger.warn(`Analyzer[${analyzer.name}] failed`);
            console.log(error);   
            completeAnalyzer(analyzer);
        }

        /* Store the acquired results from each analyzer */
        function onAnalyzerDone(edges) {
            analyzerResults.push({
                analyzer: analyzer.name,
                edges: edges
            });

            logger.silly(`Analyzer[${analyzer.name}] aliveCount: ${edges.length}`)
            completeAnalyzer(analyzer);
        } 
    });

    /**
     * Part 3: (not really part 3, more like a part 2+)
     * 
     * Marks an analyzer as completed, and checks if we're done
     * performs the callback when all analyzers are done marking the callgraph
     */
    function completeAnalyzer(analyzer) {
        logger.info(`Analyzer[${analyzer.name}] finished`);
        analyzersCompleted[analyzer.name] = true;

        /* Only do callback when each analyzer either completed or failed */
        if (Object.keys(analyzersCompleted).length != analyzers.length) { return; }
        for (const [key, value] of Object.entries(analyzersCompleted)) {
            if (!value) { return; }
        }
        logger.verbose(`CallGraph creation completed`);
        onCallGraphComplete(callGraph, analyzerResults);
    }
}

function groupDeadFunctionsByFile(deadFunctions) {
    var files = {};

    deadFunctions.forEach(deadFunction => {
        var file = deadFunction.file;
        if (!files.hasOwnProperty(file)) {
            files[file] = [];
        }
        files[file].push(deadFunction);
    })
    return files;
}

/**
 * Retrieves the functions from javascript
 */
function retrieveFunctions(scripts) {
    var functions = [];

    scripts.forEach((script) => {
        var jse = new JsEditor();
        jse.loadSource(script.source, script.src);
        var functionsOfFile = jse.loadFunctionData();
        functions = functions.concat(functionsOfFile);

        logger.silly(`[${functionsOfFile.length}] ${script.src}`);
    });

    return functions;
}

/**
 * Retrieves both the internal as external scripts from an HTML file
 *
 * @param entryFile the HTML file location
 */
function retrieveScripts(entryFile) {
    var htmle = new HTMLEditor().loadFile(entryFile);
    var scripts = [];

    var externalScripts = htmle.getExternalScripts();
    externalScripts.forEach((extScript) => {
        scripts.push({
            src: extScript.src,
            source: extScript.source,
            type: "external"
        });
    });

    var internalScripts = htmle.getInternalScripts();
    internalScripts.forEach((intScript) => {
        scripts.push({
            src: intScript.src,
            source: intScript.source,
            type: "internal"
        });
    });

    return scripts;
}

/**
 * Retrieves the analyzer objects
 * The analyzers are created as classes, this function will map the analyzer 
 * names to a corresponding object of the analyzer.
 * 
 * @param {*} analyzerNames 
 * @returns [{name: <String>, object: <AnalyzerObject>}]
 */
function retrieveAnalyzers(analyzerNames) {
    var analyzers = [];

    analyzerNames.forEach((analyzerName) => {
        var analyzerRequirePath = "./" + path.join(lacunaSettings.ANALYZERS_DIR, analyzerName);
        try {
            var Analyzer = require(analyzerRequirePath);
            analyzers.push({ name: analyzerName, object: new Analyzer() });
        } catch (e) { logger.error('Cannot find ' + analyzerRequirePath); }
    });

    return analyzers;
}



module.exports = {
    run
}