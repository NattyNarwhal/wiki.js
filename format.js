var fs      = require("fs"),
    path    = require("path"),
    sprintf = require("sprintf-js"),
    marked  = require("marked");

// Config options
var wikidir = "./wiki";
marked.setOptions({
    // TODO: does this make sense? makeLinks should be using a semantic span tag/class attrib..
    sanitize: true,
    gfm: true
});

var camelCase = /[A-Z][a-z]*[A-Z][a-z]*\b/g;
var link = "[%s](%s)";

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
    // check for "redlinks"
    if (!fs.existsSync(path.join(wikidir, match))) {
        final = sprintf.sprintf("*%s*", final);
    }
    final = sprintf.sprintf(link, final, match);
    return final;
}

exports.parsePage = function(content) {
	return marked(content.replace(camelCase, this.makeLinks));
}

exports.getMtime = function(fileName) {
	return fs.statSync(fileName).mtime;
}