/*
	static
	Static analysis algorithm for the 'hybrid' JDCE tool.

	Statically analyze the source, then returns a list of functions to remove.
	Static analysis tool copied & adapted from https://github.com/abort/javascript-call-graph
*/


// const Graph = require('../graph'),
    //   GraphTools = require('../graph_tools'),
const staticAnalyzer = require('./static/static');



module.exports = function()
{
	this.run = function(runOptions, callGraph, scripts, callback)
	{
		// gets unique edges from the static analyzer
		let edges = staticAnalyzer(scripts, runOptions.entry);

		// edges contains an array with the following object:
		// {caller: {file, start, end}, callee: {file, start, end} } 
		edges.forEach(function (edge) {
			console.log(edge);
			console.log("STATIC ADD EDGE");
			callGraph.addEdge(edge.caller, edge.callee, "static");
		});

		callback(edges);
	};
};
