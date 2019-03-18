/**
 * Converting objects to DOT format
 * 
 * @author Kishan Nirghin
 * @date 17-03-2018
 * @description
 * DOT format is used to describe graphs in a textual manner
 * http://www.webgraphviz.com/ can be used as a live demo.
 * 
 * Since DOT is really convenient, but not very JSON/JavaScript friendly,
 * this class was born to convert JSON to DOT; or built a DOT object on the fly.
 * 
 * @example object format
 * {
 *   graphName: "schoolgraph",
 *   graphType: "digraph",
 *   edges: [{
 *     node1: "University",
 *     node2: "Job",
 *     options: [{
 *       key: "label",
 *       value: "2 Years of experience"
 *      }]
 *   }]
 * }
 * 
 * @example DOT format
 * digraph schoolgraph {
 *   "University" -> "Job" [label="2 Years of experience" color="red"];
 *   "PreSchool" -> "University" [label="Brains" color="green"];
 * }
 */
class Dotify {

    constructor(graphType, graphName) {
        this.graphType = graphType;
        this.graphName = graphName;
        this.edges = [];

        if (!graphType in GRAPH_TYPE_MAP) {
            console.log("Dotify Warning: unknown graphType " + graphType);
        }
    }

    /**
     * Adds an edge to the object
     * 
     * @param {String} node1 
     * @param {String} node2 
     * @param {Array<option>} options [{key: null, value: value}]
     */
    addEdge(node1, node2, options) {
        this.edges.push({
            node1: node1,
            node2, options,
            options: options
        });
    }

    addEdges(edges) {
        edges.forEach(edge => addEdge(edge));
    }

    /** Creates a JSON object of the dotify data */
    getObject() {
        return {
            graphType: this.graphType,
            graphName: this.graphName,
            edges: this.edges
        }
    }

    /** returns the representing DOT string */
    getDOT() {
        var obj = this.getObject();
        return objectToDOT(obj);
    }
}


const GRAPH_TYPE_MAP = {
    graph: '--',
    digraph: '->'
};

/** Converts a JSON object to a DOT string */
function objectToDOT(obj) {
    var DOT = [];
    DOT.push(obj.graphType);
    DOT.push(obj.graphName);
    DOT.push("{\n");

    obj.edges.forEach((edge) => {
        var edgeDOT = `"${edge.node1}" ${GRAPH_TYPE_MAP[obj.graphType]} "${edge.node2}"`;

        if (edge.options) {
            var edgeDOTOptions = "[";
            edge.options.forEach((option) => {
                edgeDOTOptions += `${option.key}="${option.value}" ` 
            });
            edgeDOTOptions += "]";
            edgeDOT += " " + edgeDOTOptions;
        }
        edgeDOT += "\n";
        DOT.push(edgeDOT);
    });
    DOT.push("}");
    return DOT.join(" ");
}

module.exports = {
    Dotify,
    objectToDOT
}