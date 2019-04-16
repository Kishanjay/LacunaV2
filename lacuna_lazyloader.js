/**
 * Everything related to lazy loading
 */

const fs = require("fs"),
    path = require("path")

const settings = require("./_settings");


module.exports = class LazyLoader {
    constructor() {
        this.storage = {};
    }

    /**
     * Adds a function to the lazyload storage database
     */
    add(functionData, functionBody) {
        var id = settings.functionDataToId(functionData);
        this.storage[id] = functionBody;
    }

    /**
     * Fetches the lazy load replacement for a function
     */
    getLazyLoadReplacement(functionData) {
        var id = settings.functionDataToId(functionData);
        return `lacuna_lazy_load("${id}", functionData => eval(functionData))`;
    }

    /**
     * Function that actually does the http request 
     */
    getLazyLoadFrame() {
        return `// LACUNA LAZY LOAD FALLBACK
function lacuna_lazy_load(id, callback){
    fetch("http://127.0.0.1:${settings.LAZY_LOAD_SERVER_PORT}/lazyload/", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({id})
    }).then(response => {
        return response.text();
    }).then(callback);
}\n`
    }

    /**
     * Exports a server that is capable of retrieving all functions
     * present in the storage
     */
    exportStorage(destinationFolder) {
        console.log("exporting serveR)");
        fs.writeFileSync(path.join(destinationFolder, "lacuna_lazyload_storage.json"), JSON.stringify(this.storage, null, 4), 'utf8');
    }
}


function getLazyLoadServerCode() {
    return `//Lazy Load Server v0.9
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const port = ${settings.LAZY_LOAD_SERVER_PORT};

var lazyloadStorage = JSON.parse(fs.readFileSync(path.join(__dirname, 'lacuna_lazyload_storage.json'), 'utf8'));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json())


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/lazyload', (req, res) => {
    var id = req.body.id;
    var functionBody = lazyloadStorage[id];
    res.send(functionBody);
});

app.listen(port, () => {
    console.log("Lazy load server is listening on port: " + port);
});`
}