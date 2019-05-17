var logger = require("../_logger");
const child_process = require("child_process");
const path = require("path");

module.exports = function () {
    this.run = function (runOptions, callGraph, scripts, callback) {
        
        var relevantScripts = scripts.filter((script) => {
            if (script.source.length > 1) { return script; }
        })

        if (relevantScripts.length > 1) {
            logger.warn("[npm-cg] error - doesn't support multiple scripts");
            return callback(null);
        }
    
        var scriptSrc = path.join(runOptions.directory, relevantScripts[0].src);
        npmCgAnalyzer(scriptSrc, function (npmCgEdges) {
            npmCgEdges = JSON.parse(npmCgEdges);
            var edges = [];

            npmCgEdges.forEach(npmCgEdge => {
                var callerGroups = getGroups(npmCgEdge.caller);
                var calleeGroups = getGroups(npmCgEdge.callee);
                
                var file = relevantScripts[0].src;
                var caller = {file: file, range: [null, null]};
                if (callerGroups.functionName) {
                    callGraph.convertToFunctionData({functionName: calleeGroups.functionName});
                }
                var callee = callGraph.convertToFunctionData({functionName: calleeGroups.functionName});

                var edge = callGraph.addEdge(caller, callee, "npm_cg", true);
                edges.push(edge);
            });

            return callback(edges);
        });
    }
}

function getGroups(str) {
    return str.match(/\[(?<filename>.+)\](?<functionName>.*)/).groups;
}

function npmCgAnalyzer(scriptSrc, callback) {
    let command = 'node  ./index.js ../../../' + scriptSrc;
    let settings = {
        // cwd: './analzers/npm_cg/callgraph',
		maxBuffer: 1024 * 1000 * 1000	// 1 GB
	};

    var cwd = process.cwd();
    process.chdir('./analyzers/npm_cg/callgraph/');
    child_process.exec(command, settings, function (error, stdout, stderr) {
        process.chdir(cwd);
        callback(stdout);
	});
}
