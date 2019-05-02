/**
 * @author Kishan Nirghin
 * @description WALA adapter for Lacuna
 * Freshly written WALA CallGraph adapter for Lacuna
 * 
 * @repository https://github.com/Kishanjay/WALA-JSONCallGraph
 */

const path = require("path"),
	child_process = require("child_process");

module.exports = function()
{
	this.run = function(runOptions, callGraph, scripts, callback) {
		var entryFile = path.join(runOptions.directory, runOptions.entry);
		
		walaAnalyzer(entryFile, edges => {
			/* {caller: {file, start, end}, callee: {file, start, end} } */
			edges.forEach(function (edge) {
				edge.caller.file = path.normalize(edge.caller.file);
				edge.callee.file = path.normalize(edge.callee.file);

				/* Try the edge case that the caller is actually a unidentified rootNode */
				var functionDataCaller = null;
				if (callGraph.nodeExists(edge.caller)) {
					functionDataCaller = callGraph.getNode(edge.caller);
				} else {
					functionDataCaller = callGraph.assertRootNode({file: edge.caller.file, range: [null, null]}, true);
				}

				/* Add the edge to the callGraph */
				callGraph.addEdge(functionDataCaller, edge.callee, "wala");
			});

			return callback(edges);
		});
	};
};


/**
 * Actually running the WALA analyzer
 */
function walaAnalyzer(file, callback) {
	let command = 'java -jar ./analyzers/WALA/JSONCallGraph.jar ' + file;
	let settings = {
		maxBuffer: 1024 * 1000 * 1000	// 1 GB
	};

	// Run the WALA jar.
	child_process.exec(command, settings, function (error, stdout, stderr) {
		var edges = JSON.parse(stdout);
		callback(edges);
	});
}