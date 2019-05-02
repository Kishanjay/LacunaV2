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

const Node = require("./call_graph-node");

module.exports = class CallGraph {
    constructor(functions) {
        this.nodes = [];
        this.edges = [];

        /* Note: these aren't functions, rather the files that call functions */
        this.rootNodes = [];

        functions.forEach((functionData) => {
            this.addNode(functionData);
        })
    }

    /** 
     * Creates a new node and adds it to the callGraph
     * Also creates a rootNode if necessary
     */
    addNode(functionData) {
        if (!this.fitsNode(functionData)) {
            logger.warn("[addNode] adding invalid node", functionData);
        }
        this.nodes.push(new Node(functionData));

        /* Check if a rootNode should be added */
        var rootNode = { file: functionData.file, type: 'rootNode', range: [null, null] };
        if (!this.getRootNode(rootNode)) {
            this.rootNodes.push(new Node(rootNode));      
        }
    }

    /**
     * Adds a valid rootNode based on the functionData
     */
    addRootNode(functionData, stripObject) {
        var rootNode = this.getRootNode(functionData);
        if (rootNode) {
            logger.warn("[addRootNode] already exists", functionData);    
        }
        else {
            rootNode = new Node({ file: functionData.file, range: [null, null] });
            this.rootNodes.push(rootNode);
        }
        return stripObject ? rootNode.functionData : rootNode;
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
     * 
     * NOTABLE FIX - a bit sloppy but: when an edge is added from a rootNode
     * there is a change that this rootNode does not exist (yet). Therefore
     * check if the caller is a rootNode and add if it doesn't yet exist
     * 
     * (TODO better fix: create all rootNodes at the start - thus for every
     * involved file)
     */
    addEdge(functionDataCaller, functionDataCallee, analyzer, stripObject) {
        if (this.fitsRootNode(functionDataCaller) && !this.getRootNode(functionDataCaller)) {
            this.rootNodes.push(new Node(functionDataCaller));
        }
        var caller = this.getNode(functionDataCaller);
        var callee = this.getNode(functionDataCallee);

        return caller.addEdge(callee, analyzer, stripObject);
    }

    /** 
     * Fetches an existing nodeObject given its functionData
     */
    getNode(functionData, excludeRootNodes) {
        var nodeList = this.nodes;
        if (!this.fitsNode(functionData)) {
            if (!(this.fitsRootNode(functionData))) {
                logger.warn("[getNode] Invalid node", functionData);
                return null;    
            }
            if (excludeRootNodes) {
                logger.warn("[getNode] rootNodes excluded", functionData);
                return null;
            }
            /* continue with rootNodes */
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

        logger.warn("[getNode] not found", functionData);
        return null;
    }

    /**
     * Should only be getting rootNodes
     */
    getRootNode(functionData, stripObject) {
        if (!this.fitsRootNode(functionData)) {
            logger.warn("[getRootNode] invalid node", functionData);
        }
        for (var i = 0; i < this.rootNodes.length; i++){
            if (this.rootNodes[i].functionData.file == functionData.file) {
                var rootNode = this.rootNodes[i];

                return stripObject ? rootNode.functionData : rootNode;
            }
        }
        return null;
    }

    /**
     * Fetches a rootNode, creates it if it didn't exist yet.
     */
    assertRootNode(functionData, stripObject) {
        var rootNode = this.getRootNode(functionData, stripObject);
        if (!rootNode) {
            logger.info("Creating rootnode", functionData);
            rootNode = this.addRootNode(functionData, stripObject);
        }
        return rootNode;
    }

    /**
     * If some functionData fits the rootNode constraints
     */
    fitsRootNode(functionData) {
        return (functionData.range[0] == null && functionData.range[0] == null)
    }

    /**
     * If some functionData fits the node constraints.
     */
    fitsNode(functionData) {
        return (functionData.range[0] != null && functionData.range[1] != null);
    }

    /**
     * Boolean on whether a node exists
     */
    nodeExists(functionData) {
        if (!this.fitsNode(functionData)) {
            logger.warn("[nodeExists] Invalid node", functionData);
            return false;
        }
        this.nodes.forEach((node) => {
            if (node.functionData.file == functionData.file &&
                node.functionData.range[0] == functionData.range[0] &&
                node.functionData.range[1] == functionData.range[1]) {
                return node;
            }
        });
        return false;
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

