/**
 * @description Class that is responsible for editing HTML files.
 * Contains methods to retrieve JS files or code.
 * 
 * @version 0.1
 * @author Kishan Nirghin
 * @Date 12-02-2019
 */
const cheerio = require("cheerio"),
    fs = require("fs"),
    path = require("path"),
    downloadFileSync = require("download-file-sync");

const settings = require("./_settings");
const logger = require("./_logger");

VALID_JS_TYPES = ['text/javascript', 'application/javascript', 'application/ecmascript', 'text/ecmascript'];

module.exports = class HTMLEditor {
    loadFile(filePath) {
        this.filePath = filePath;
        this.source = this.originalSource = fs.readFileSync(filePath).toString();
        this.html = this.originalHtml = cheerio.load(this.source);
        return this;
    }

    /**
     * This function responsible for retrieving ALL external JS files.
     * That means everything but the inline JS. 
     * 
     * By default it will only consider JS files from the same server as the
     * HTML file being considered.
     * 
     * Having the option: CONSIDER_ONLINE_JS_FILES enabled in the _settings
     * will also take externally hosted JS files into account.
     */
    getExternalScripts() {
        var currentDirectory = path.dirname(this.filePath);
        var cScripts = this.html('script');

        var scripts = [];
        cScripts.each((index, cScriptElement) => {
            if (cScriptElement.attribs["src"]) {
                /* If the type attribute is set it should be valid for JS */
                var scriptType = cScriptElement.attribs["type"];
                if (scriptType && !VALID_JS_TYPES.includes(scriptType)) return;

                /* Assume the script is hosted on same server */
                var scriptSrc = cScriptElement.attribs["src"];

                /* Checks if the script is externally hosted */
                if (isExternallyHosted(scriptSrc)) {
                    if (!settings.CONSIDER_ONLINE_JS_FILES) { return; }
                    logger.verbose(`Downloading ${scriptSrc}`);
                    
                    var onlineFileContent = downloadFileSync(scriptSrc);
                    var downloadedFileName = path.basename(scriptSrc);
                    fs.writeFileSync(path.join(currentDirectory, downloadedFileName), onlineFileContent);

                    /* Update reference in HTML file */
                    var oldReference = this.html.html(cScriptElement);
                    var newReference = `<script src="${downloadedFileName}"></script>`;
                    this.updateCode(oldReference, newReference);
                    this.saveFile();

                    /* Overwrite scriptSrc to new local file */
                    scriptSrc = downloadedFileName;
                }

                var absoluteScriptSrc = path.join(currentDirectory, scriptSrc);
                scripts.push({
                    src: absoluteScriptSrc,
                    index: index,
                    source: fs.readFileSync(absoluteScriptSrc).toString(),
                });
            }
        });
        return scripts;
    }
    getInternalScripts() {
        var cScripts = this.html('script');

        var scripts = [];
        cScripts.each((index, cScriptElement) => {
            if (!cScriptElement.attribs["src"]) {
                var scriptType = cScriptElement.attribs["type"];
                if (scriptType && !VALID_JS_TYPES.includes(scriptType)) return;
                
                var source = cheerio(cScriptElement).html();
                var bodyStart = this.source.indexOf(source);
                var bodyEnd = bodyStart + source.length;

                scripts.push({
                    src: this.filePath,
                    index: index,
                    source: cheerio(cScriptElement).html(),
                    bodyRange: [bodyStart, bodyEnd]
                });
            }
        });
        return scripts;
    }

    /**
     * Updates lines of code from the HTML file
     */
    updateCode(oldCode, newCode) {
        var index = this.source.indexOf(oldCode);
        if (index < 0) {
            return logger.error(`[html_editor] cannot update code: '${oldCode}' not found`);
        }
        this.source = this.source.splice(index, oldCode.length, newCode);
    }

    saveFile() {
        fs.writeFileSync(this.filePath, this.source);
    }
}

/**
 * Stateless helper function
 */
function isExternallyHosted(scriptSrc) {
    return scriptSrc.toLowerCase().startsWith("http:/") || scriptSrc.toLowerCase().startsWith("https:/");
}