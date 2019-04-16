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
        var cScripts = this.html('script');

        var scripts = [];
        cScripts.each((index, cScriptElement) => {
            if (!cScriptElement.attribs["src"]) { return; }/* skip internal */

            /* If the type attribute is set it should be valid for JS */
            var scriptType = cScriptElement.attribs["type"];
            if (scriptType && !VALID_JS_TYPES.includes(scriptType)) return;

            /* Assume the script is hosted on same server */
            var scriptSrc = cScriptElement.attribs["src"];

            /* Checks if the script is externally hosted */
            if (isExternallyHosted(scriptSrc)) {
                if (!settings.CONSIDER_ONLINE_JS_FILES) { return; }

                /* Download the online script and update all references */
                scriptSrc = adoptOnlineScript(scriptSrc);
            }

            var absoluteScriptSrc = path.join(path.dirname(this.filePath), scriptSrc);
            scripts.push({
                src: absoluteScriptSrc,
                index: index,
                source: fs.readFileSync(absoluteScriptSrc).toString(),
            });
            
        });
        return scripts;
    }

    /**
     * Function responsible for retrieving all internal scripts from HTML code
     * 
     * Lacuna will not only 'get' the internal scripts, but also store them
     * into an external file and update the HTML reference.
     */
    getInternalScripts() {
        var cScripts = this.html('script');

        var scripts = [];
        cScripts.each((index, cScriptElement) => {
            if (cScriptElement.attribs["src"]) { return; } /* skip external */

            /* If the type attribute is set it should be valid for JS */
            var scriptType = cScriptElement.attribs["type"];
            if (scriptType && !VALID_JS_TYPES.includes(scriptType)) return;
            
            /* Store the inline script into a local file */
            var inlineScriptContent = cheerio(cScriptElement).html();
            var randomFileName = getRandomFilename(6) + ".js";
            var localFilePath = path.join(path.dirname(this.filePath), randomFileName);
            fs.writeFileSync(localFilePath, inlineScriptContent);

            /* Update the reference */
            var oldReference = this.html.html(cScriptElement);
            var newReference = `<script src="${randomFileName}"></script>`;
            this.updateCode(oldReference, newReference);
            this.saveFile();

            scripts.push({
                src: localFilePath,
                index: index,
                source: inlineScriptContent,
            });
        });
        return scripts;
    }

    getEventAttributeScript() {
        var eventAttributeScriptContent = "";
        var htmlEventAttributes = getHtmlEventAttributes();
        htmlEventAttributes.forEach(attrib => {
            var elementsWithAttribs = this.html("[" + attrib + "]");
            elementsWithAttribs.each((index, cElement) => {
                var code = cElement.attribs[attrib];
                eventAttributeScriptContent += code;
                eventAttributeScriptContent += ";";
            });
        });
        /* Temp store it in a file to fix some issues */
        var randomFileName = getRandomFilename(6);
        var localFilePath = path.join(path.dirname(this.filePath), randomFileName);
        fs.writeFileSync(localFilePath, eventAttributeScriptContent);

        return {
            src: localFilePath,
            index: -1,
            source: eventAttributeScriptContent
        };
    }

    /**
     * Updates lines of code from the HTML file
     * 
     * The index function may fail when there are weird linebreaks
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

    /**
     * Downloads and uses an online script
     * 
     * First it downloads it to the currectDirectory
     * Then it updates all references in the current file to use the local
     * version of the script
     */
    adoptOnlineScript(scriptSrc) {
        if (!isExternallyHosted(scriptSrc)) { logger.error("Invalid action"); }; 
        logger.verbose(`Downloading ${scriptSrc}`);
                
        var onlineScriptContent = downloadFileSync(scriptSrc);
        var downloadedFileName = path.basename(scriptSrc);
        var localFilePath = path.join(path.dirname(this.filePath), downloadedFileName);
        fs.writeFileSync(localFilePath, onlineScriptContent);

        /* Update reference in HTML file */
        var oldReference = this.html.html(cScriptElement);
        var newReference = `<script src="${downloadedFileName}"></script>`;
        this.updateCode(oldReference, newReference);
        this.saveFile();

        /* Returns the new filename */
        return downloadedFileName;
    }
}

/**
 * Stateless helper function
 */
function isExternallyHosted(scriptSrc) {
    return scriptSrc.toLowerCase().startsWith("http:/") || scriptSrc.toLowerCase().startsWith("https:/");
}

/**
 * Snippet to generate a random filename given a length
 */
function getRandomFilename(length) {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
}


/**
 * Big list from w3schools
 */
function getHtmlEventAttributes() {
    return [
        // Window Event Attributes
        "onafterprint", "onbeforeprint", "onbeforeunload", "onerror", "onhashchange",
        "onload", "onmessage", "onoffline", "ononline", "onpagehide", "onpageshow",
        "onpopstate", "onresize", "onstorage", "onunload",

        // Form Events
        "onblur", "onchange", "oncontextmenu", "onfocus", "oninput", "oninvalid",
        "onreset", "onsearch", "onselect", "onsubmit",

        // Keyboard Events
        "onkeydown", "onkeypress", "onkeyup",

        // Mouse Events
        "onclick", "ondblclick", "onmousedown", "onmousemove", "onmouseout",
        "onmouseover", "onmouseup", "onmousewheel", "onwheel",

        // Drag Events
        "ondrag", "ondragend", "ondragenter", "ondragleave", "ondragover",
        "ondragstart", "ondrop", "onscroll",

        // Clipboard Events
        "oncopy", "oncut", "onpaste",

        // Media Events
        "onabort", "oncanplay", "oncanplaythrough", "oncuechange",
        "ondurationchange", "onemptied", "onended", "onerror", "onloadeddata",
        "onloadedmetadata", "onloadstart", "onpause", "onplay", "onplaying",
        "onprogress", "onratechange", "onseeked", "onseeking", "onstalled",
        "onsuspend", "ontimeupdate", "onvolumechange", "onwaiting",

        // Misc Events
        "ontoggle"
    ];
}









