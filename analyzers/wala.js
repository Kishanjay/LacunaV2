/*
	wala_single
	Analysis by the WALA framework for JavaScript.
	Parses per-file.

	See https://github.com/wala/WALA.
*/


const wala_single_analyzer = require('./wala_single/wala_single');
const path = require("path");



module.exports = function()
{
	// this.run = function(settings, callback)
	this.run = function(runOptions, callGraph, scripts, callback) {
		wala_single_analyzer(runOptions, scripts, function (edges) {

			edges.forEach((edge) => {
				/* Creates a valid relativePath to sourceDir (instead of pwd)*/
				edge.caller.file = getSrcPath(edge.caller.file, runOptions);
				edge.callee.file = getSrcPath(edge.callee.file, runOptions);	

				callGraph.addEdge(edge.caller, edge.callee, "wala");
			});

			callback(edges);
		});
	};
};


/**
 * Converts a path relative to pwd to a path relative to the sourceDirectory
 */
function getSrcPath(pwdPath, runOptions) {
    var srcPath = path.normalize(pwdPath).trim();
    var dir = runOptions.directory; /* already normalized */

    if (dir != srcPath.slice(0, dir.length)) {
        console.log("[getSrcPath] invalid path: ", srcPath);
    }
    return srcPath.slice(dir.length + 1);
}