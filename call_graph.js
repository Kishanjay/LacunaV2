/**
 * @author Kishan Nirghin
 * 
 * @description Callgraph of functions relations
 * The extendible callgraph that should represent all functioncalls of a project
 * The nodes: being the functions
 * and edges: caller-callee relationships
 * 
 * The rootNodes are nodes that are autoexecuted at the start
 * for now these are the files that contain the JS functions.
 * e.g. whenever a function is executed from a JS file, the function will become
 * a node, and that file that triggered the execution will become a rootNode.
 * 
 * The following params are used throughout this file
 * @param functionData {
 *    file: {String},
 *    range: [{Number}, {Number}]
 *  }
 *  thus all data that represent a function. Note that for rootNodes the ranges
 *  are both null.
 * 
 * @param stripObject {Boolean}
 *  To deal with circular structures (which any graph probably suffers from),
 *  the strip option will remove any references to other objects, and rather
 *  uses the raw data.
 */

const { Dotify, objectToDOT } = require("./dotify");
const logger = require("./_logger");
const path = require("path");

module.exports = class CallGraph {
    constructor(functions) {
        this.nodes = [];
        this.edges = [];
        this.rootNodes = []; /* auto executed, not real functions */

        functions.forEach((functionData) => {
            this.addNode(functionData);
        })
    }

    /** 
     * Creates a new node and adds it to the callGraph
     * Also creates a rootNode if necessary
     */
    addNode(functionData) {
        if (functionData.range[0] == null || functionData.range[1] == null) {
            logger.warn("rootNodes should be added automatically");
        }
        this.nodes.push(new Node(functionData));

        /* Check if a rootNode should be added */
        var rootNode = { file: functionData.file, type: 'rootNode', range: [null, null] };
        if (!this.rootNodeExists(rootNode)) {
            this.rootNodes.push(new Node(rootNode));      
        }
    }

    /**
     * Creates a new alive node with an unknown caller
     */
    addAliveNode(functionData, analyzer) {
        var rootNodeFunctionData = { file: functionData.file, range: [null, null] };
        var edge = this.addEdge(rootNodeFunctionData, functionData, analyzer, true);
        return edge;
    }

    /** 
     * Wrapper function to add an edge to a node
     * It fetches both nodes a adds a newly created edge to the caller
     */
    addEdge(functionDataCaller, functionDataCallee, analyzer, stripObject) {
        var caller = this.getNode(functionDataCaller);
        var callee = this.getNode(functionDataCallee);

        return caller.addEdge(callee, analyzer, stripObject);
    }

    /** 
     * Fetches an existing nodeObject given its functionData
     * Also supports rootNodes, as its range[0,1] will be null
     */
    getNode(functionData) {
        var nodeList = this.nodes;
        if (functionData.range[0] == null || functionData.range[1] == null) {
            if (!functionData.range[0] == null && functionData.range[1] == null) {
                logger.warn("Invalid node");
            }
            nodeList = this.rootNodes;
        }

        for (var i = 0; i < nodeList.length; i++){
            var node = nodeList[i];
            if (node.functionData.file == functionData.file &&
                node.functionData.range[0] == functionData.range[0] &&
                node.functionData.range[1] == functionData.range[1]) {
                
                return node;
            }
        };

        logger.warn("Could not find node", functionData);
        return null;
    }

    /** 
     * TODO: Should be replaced with getNode
     */
    getRootNode(functionData) {
        if (functionData.range[0] != null || functionData.range[1]) {
            logger.warn("Invalid rootnode", functionData);
        }
        for (var i = 0; i < this.rootNodes.length; i++){
            if (this.rootNodes[i].functionData.file == functionData.file) {
                return this.rootNodes[i];
            }
        }
        return null;
    }

    /**
     * Returns a Boolean on whether the rootNode already exists
     */
    rootNodeExists(functionData) {
        return (this.getRootNode(functionData) != null)
    }

    

    /**
     * Prints the callgraph in a pseudo readable/interpretable format
     */
    print() {
        this.rootNodes.forEach((node) => {
            node.printGraph(0);
        });
    }

    /** 
     * Gets the DOT representation of the current callgraph
     */
    getDOT() {
        var dotty = new Dotify("digraph", "lacunaCG"); 

        /* the expanding list of considered nodes => prevents infinite loops */
        var consideredNodes = [];
        this.rootNodes.forEach((node) => {
            node.addToDotify(dotty, consideredNodes);
        });

        return dotty.getDOT();
    }

    /** 
     * Fetches the nodes that are not called by any other node
     * (Dead functions).
     */
    getDisconnectedNodes(stripObject) {
        var connectedNodes = this.getConnectedNodes(stripObject);

        var disconnectedNodes = [];
        this.nodes.forEach((node) => {
            if (!connectedNodes.includes(node.functionData)) {
                disconnectedNodes.push(node.functionData);
            }
        });

        return disconnectedNodes;
    }

    /** 
     * Fetches all nodes (except the rootNodes) that have been called
     * Starts from the rootNodes and works downwards.
     */
    getConnectedNodes(stripObject) {
        var connectedNodes = [];

        this.rootNodes.forEach((childNode) => {
            var node = stripObject ? childNode.functionData : childNode;
            if (connectedNodes.includes(node)) { return; }

            // if (addRootNodes) { connectedNodes.push(node); }
            childNode.addConnectedNodes(connectedNodes, stripObject);
        });
        return connectedNodes;
    }

    /**
     * Fetches some base stats about the current callgraph
     */
    getStatistics() {
        var connectedNodes = this.getConnectedNodes(true);
        var disconnectedNodes = this.getDisconnectedNodes(true);

        return {
            connectedNodes: connectedNodes.length,
            disconnectedNodes: disconnectedNodes.length,
            nodes: this.nodes.length,
            files: this.rootNodes.length
        }
    }

    /**
     * Getters
     */
    getNodes(stripObject) {
        var nodes = [];
        this.nodes.forEach((node) => {
            if (stripObject) { node = node.functionData; }
            nodes.push(node);
        });
        return nodes;
    }
    getRootNodes(stripObject) {
        var rootNodes = [];
        this.rootNodes.forEach((node) => {
            if (stripObject) { node = node.functionData; }
            rootNodes.push(node);
        });
        return rootNodes;
    }
}


/** ============================================================================
 *  CLASS SEPERATOR
 * ========================================================================== */


/**
 * @description The representation of a function within this callgraph
 */
class Node {
    constructor(functionData) {
        this.edges = []; // edges to other nodes (directional/one-way edges)
        functionData.file = path.normalize(functionData.file);
        this.functionData = functionData; // preserves original function data
    }

    /**
     * Adds an edge to another node  
     * 
     * NOTE multiple edges can exist between the same nodes
     */
    addEdge(node, analyzer, stripObject) {
        var edge = new Edge(this, node, analyzer);
        this.edges.push(edge);

        var caller = edge.caller;
        var callee = edge.callee;

        if (stripObject) {
            caller = caller.functionData;
            callee = callee.functionData;
        }
        return {
            caller,
            callee
        }
    }

    /**
     * Adds all nodes connected to this node to the connectedNodes array
     * doesnt return anything as it stores the result in the array.
     */
    addConnectedNodes(connectedNodes, stripObject) {
        this.edges.forEach((edge) => {
            var callee = edge.callee;
            if (stripObject) { callee = callee.functionData; }

            /* If we've encountered that node before, skip */
            if (connectedNodes.includes(callee)) { return; }
            
            connectedNodes.push(callee);
            edge.callee.addConnectedNodes(connectedNodes, stripObject);
        })
    }

    /** Prints the current node and its children */
    printGraph(iter) {
        console.log("\t".repeat(iter), this.__str__());

        this.edges.forEach((edge) => {
            edge.callee.printGraph(iter+1);
        });
    }

    /**
     * Add all self to child relations to the dotify object
     * 
     * @param {Dotify} dotty
     * Dotty object that will store all the object data
     */
    addToDotify(dotty, consideredNodes) {
        /* Prevent infinite loops */
        if (consideredNodes.includes(this)) { return; }
        consideredNodes.push(this);

        this.edges.forEach((edge) => {
            dotty.addEdge(this.__str__(), edge.callee.__str__(), { label: edge.analyzer });
            
            /* Recursively add grand-child relations */
            edge.callee.addToDotify(dotty, consideredNodes); 
        });
    }

    /** String representation of the node */
    __str__() {
        return this.functionData.type + "@" + this.functionData.file + ":" + this.functionData.range;
    }
}


/** ============================================================================
 *  CLASS SEPERATOR
 * ========================================================================== */
/** represents a caller-callee relationship (directional edge) */
class Edge {
    constructor(caller, callee, analyzer) {
        this.caller = caller;
        this.callee = callee;
        this.analyzer = analyzer;
    }
}
