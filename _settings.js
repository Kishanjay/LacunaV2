module.exports = {
    ANALYZERS_DIR: "analyzers",
    
    OPTIMIZATION_LEVELS: [
        0, // do not replace anything, leaves source-code intact
        1, // replace functions with lazy loading mechanism
        2, // replace functions with empty functions
        3, // replace functions with null
        4, // remove function reference entirely
    ],

}