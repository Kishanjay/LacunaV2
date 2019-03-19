/**
 * The extendible callgraph of all functions
 * A callgraph has nodes: functions
 * and edges: caller-callee relationships
 * 
 * The rootNodes are nodes that are autoexecuted at the start
 * for now these are the files that contain the JS functions.
 * e.g. whenever a function is executed from a JS file, the function will become
 * a node, and that file that triggered the execution will become a rootNode.
 */

const { Dotify, objectToDOT } = require("./dotify");
const logger = require("./_logger");

module.exports = class CallGraph {
    constructor(functions) {
        this.nodes = [];
        this.edges = [];
        this.rootNodes = []; /* auto executed, not really functions */

        functions.forEach((functionData) => {
            this.addNode(functionData);
        })
    }

    /** Creates and adds new node to callgraph */
    addNode(functionData) {
        this.nodes.push(new Node(functionData));

        /* Check if a rootNode should be added */
        if (!this.rootNodeExists(functionData)) {
            this.rootNodes.push(new Node({file: functionData.file, type: 'rootNode', range: [null, null]}));      
        }
    }

    /** Creates a new node that we know is alive (unknown caller) */
    addAliveNode(functionData, analyzer) {
        var rootNodeFunctionData = { file: functionData.file, range: [null, null] };
        var edge = this.addEdge({ caller: rootNodeFunctionData, callee: functionData }, analyzer);
        return edge;
    }

    /** Adds an edge between 2 functions
     * the edge param should contain {
     *  called: functionData,
     *  caller: functionData
     * }
     */
    addEdge(edge, analyzer) {
        var calleeNode = this.getNode(edge.callee);
        var callerNode = this.getNode(edge.caller);

        return callerNode.addEdge(calleeNode, analyzer);
    }

    /** Fetches the Node object based on the function data */
    getNode(functionData) {
        var nodeList = this.nodes;
        if (functionData.range[0] == null) {
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
     * Checks whether there already exists a rootNode for the given functionData
     * (meaning that there exists a node for that file)
     */
    rootNodeExists(functionData) {
        return (this.getRootNode(functionData) != null)
    }

    getRootNode(functionData) {
        for (var i = 0; i < this.rootNodes.length; i++){
            if (this.rootNodes[i].functionData.file == functionData.file) {
                return this.rootNodes[i];
            }
        }
        return null;
    }

    /**
     * Prints the callgraph in a pseudo readable/interpretable format
     */
    print() {
        this.rootNodes.forEach((node) => {
            node.printGraph(0);
        });
    }

    /** Gets the DOT representation of the graph data */
    getDOT() {
        var dotty = new Dotify("digraph", "lacunaCG"); 
        this.rootNodes.forEach((node) => {
            node.addToDotify(dotty);
        });

        return dotty.getDOT();
    }

    /** The nodes that are not called by any node AKA dead functions */
    getDisconnectedNodes(strip) {
        var connectedNodes = this.getConnectedNodes(strip);

        var disconnectedNodes = [];
        this.nodes.forEach((node) => {
            if (!connectedNodes.includes(node.functionData)) {
                disconnectedNodes.push(node.functionData);
            }
        });

        return disconnectedNodes;
    }

    /** All nodes (except the rootNodes) that have been called */
    getConnectedNodes(strip) {
        var connectedNodes = [];

        this.rootNodes.forEach((node) => {
            connectedNodes.extend(node.getConnectedNodes(strip));
        });
        return connectedNodes;
    }

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

    /** Getters */
    getNodes(strip) {
        var nodes = [];
        this.nodes.forEach((node) => {
            if (strip) {
                nodes.push(node.functionData);
            } else {
                nodes.push(node);
            }
        });
        return nodes;
    }
    getRootNodes(strip) {
        var rootNodes = [];
        this.rootNodes.forEach((node) => {
            if (strip) {
                rootNodes.push(node.functionData);
            } else {
                rootNodes.push(node);
            }
        });
        return rootNodes;
    }
}


/** ============================================================================
 *  SEPERATOR
 * ========================================================================== */
/** represents a function */
class Node {
    constructor(functionData) {
        this.edges = []; // edges to other nodes (one-way directional)
        this.functionData = functionData; // the original function data
    }

    setAlive() {

    }

    /* Adds an edge to another node */
    addEdge(node, analyzer) {
        var edge = new Edge(this, node, analyzer);
        this.edges.push(edge);

        var returnEdge = {
            caller: edge.caller.functionData,
            callee: edge.callee.functionData
        }
        return returnEdge;
    }

    getConnectedNodes(strip) {
        var connectedNodes = [];
        this.edges.forEach((edge) => {
            if (strip) {
                connectedNodes.push(edge.callee.functionData);    
            } else {
                connectedNodes.push(edge.callee);
            }
            
            connectedNodes.extend(edge.callee.getConnectedNodes());
        })
        return connectedNodes;
    }

    /** Prints the current node and its children */
    printGraph(iter) {
        console.log("\t".repeat(iter), this.__str__());

        this.edges.forEach((edge) => {
            edge.callee.printGraph(iter+1);
        });
    }

    /**
     * Adds the edges with its children to the dotify object
     * @param {Dotify} dotty 
     */
    addToDotify(dotty) {
        /** add edges from self to all children to dotify */
        this.edges.forEach((edge) => {
            dotty.addEdge(this.__str__(), edge.callee.__str__(), {label: edge.analyzer});
            edge.callee.addToDotify(dotty); /** recursively add the edges of child to dotify */
        });
    }

    /** String representation of the node */
    __str__() {
        return this.functionData.type + "@" + this.functionData.file + ":" + this.functionData.range;
    }
}


/** ============================================================================
 *  SEPERATOR
 * ========================================================================== */
/** represents a caller-callee relationship (directional edge) */
class Edge {
    constructor(caller, callee, analyzer) {
        this.caller = caller;
        this.callee = callee;
        this.analyzer = analyzer;
    }
}
