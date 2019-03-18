/**
 * @description Class that is responsible for editing JS files.
 * Thus contains the instrumentation code aswell.
 * 
 * @version 0.1
 * @author Kishan Nirghin
 * @Date 10-02-2019
 */

const fs = require("fs"),
    esprima = require("esprima"),
    path = require("path");

require("./prototype_extension");


const ESPRIMA_FUNCTION_TYPES = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];
module.exports = class JsEditor {
    constructor(filePath = null) {
        if (filePath) { this.loadFile(filePath); }
    }

    loadSource(source, filePath = null) {
        this.source = this.originalSource = source;
        this.filePath = filePath;

        return this;
    }
    
    loadFile(filePath) {
        this.filePath = filePath;
        this.source = this.originalSource = fs.readFileSync(filePath).toString();

        return this;
    }

    loadFunctionData() {
        var functionData = [];
        var index = 0;
        esprima.parse(this.source, { range: true }, (node) => {
            if (ESPRIMA_FUNCTION_TYPES.includes(node.type)) {
                functionData.push({
                    type: node.type,
                    bodyRange: node.body.range,
                    range: node.range,
                    file: this.filePath,
                    index: index++
                });
            }
        });
        return functionData;
    }


    /**
     * Note: this function should only be called when its the js file that gets
     * overwritten. (should not be the html file)
     */
    saveFile() {
        if(this.filePath == null) {
			return console.log("js_editor save error: No file loaded");
        }
        if (path.extname(this.filePath) != ".js") {
            return console.log("js_editor save error: Invalid file");
        }
		fs.writeFileSync( this.filePath, this.source );
    }

    getSource() {
        return this.source;
    }

    getOriginalSource() {
        return this.originalSource;
    }
}