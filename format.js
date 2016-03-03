var fs      = require("fs"),
    path    = require("path"),
    sprintf = require("sprintf-js"),
    marked  = require("marked");

// Config options
var config = JSON.parse(fs.readFileSync("config.json"));

var camelCase = /\b((?:[A-Z][a-z]+){2,})(?![^()\[\]]*[)\]])\b/g;
var discreteCamelCase = /^((?:[A-Z][a-z]+){2,})(?![^()\[\]]*[)\]])$/g;
var link = "[%s](%s)";

// override the link function to provide a class for non-existant pages
var renderer = new marked.Renderer();
renderer.link = function (href, title, text) {
    if (marked.options.sanitize) {
        try {
            var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
        } catch (e) {
            return '';
        }
        if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
            return '';
        }
    }
    var out = '<a href="' + href + '"';
    if (title) {
        out += ' title="' + title + '"';
    }
    // this statement is the new clause from the marked built-in
    if (href.match(discreteCamelCase) && !fs.existsSync(path.join(config.wikiDir, href))) {
        out += ' class="redlink"';
    }
    out += '>' + text + '</a>';
    return out;
};

marked.setOptions({
    // TODO: does this make sense? makeLinks should be using a semantic span tag/class attrib..
    sanitize: true,
    gfm: true,
    renderer: renderer
});

// mapping example: [[/%TITLE%/g,"Title"],[/%META%/g,"Metadata"]]
// access via iter of array, then first el = regex; second el = to replace with
exports.formatTemplate = function (template, mappings) {
    mappings.forEach(function (element, index, array) {
        template = template.replace(element[0], element[1]);
    });
    return template;
}

exports.makeLinks = function (match, offset, whole) {
    var final = match;
    final = sprintf.sprintf(link, final, match);
    return final;
}

exports.parsePage = function (content) {
    var lexicon = marked.lexer(content);
    lexicon.map(function (element) {
        if (element.type == "paragraph") {
            element.text = element.text.replace(camelCase, exports.makeLinks);
        }
    });
    return this.makeToc(lexicon, config.tocTreshold) + marked.parser(lexicon);
}

exports.getMtime = function(fileName) {
	return fs.statSync(fileName).mtime;
}

exports.makeToc = function (lex, treshold) {
    var depth, initDepth, amount = 0;
    var html = "<ul id=\"toc\">";
    lex.forEach(function (element, index, array) {
        if (element.type == "heading") {
            if (depth == 0) {
                depth = element.depth;
                initDepth = element.depth;
            }

            if (depth > element.depth) {
                html += "</ul>";
            }
            if (depth < element.depth) {
                html += "<ul>";
            }
            depth = element.depth;
            amount++;
            html += sprintf.sprintf("<li><a href=\"#%s\">%s</a></li>",
                element.text.toLowerCase().replace(/[^\w]+/g, '-'), element.text);
        }
    });
    if (depth > initDepth) html += "</ul>";
    html += "</ul>";
    return amount > treshold ? html : "";
}