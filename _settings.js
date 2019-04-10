module.exports = {
    ANALYZERS_DIR: "analyzers",
    
    OPTIMIZATION_LEVELS: [
        0, // do not replace anything, leaves source-code intact
        1, // replace functions with lazy loading mechanism
        2, // replace functions with empty functions
        3, // replace functions with null
    ],

    /* When unique function ID's are required */
    functionDataToId(functionData) {
        return `${functionData.file}[${functionData.bodyRange[0]}:${functionData.bodyRange[1]}]`;
    },



    LAZY_LOAD_SERVER_PORT: 8125
}