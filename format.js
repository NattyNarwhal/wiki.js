var	fs         = require("fs"),
    marked     = require("marked");

marked.setOptions({
    sanitize: true,
});

var camelCase = /[A-Z][a-z]*[A-Z][a-z]*\b/g;
var link = "[$&]($&)";

// mapping example: [[/%TITLE%/g,"Title"],[/%META%/g,"Metadata"]]
// access via iter of array, then first el = regex; second el = to replace with
exports.formatTemplate = function (template, mappings) {
    mappings.forEach(function (element, index, array) {
        template = template.replace(element[0], element[1]);
    });
    return template;
}

exports.parsePage = function(content) {
	return marked(content.replace(camelCase, link));
}

exports.getMtime = function(fileName) {
	return fs.statSync(fileName).mtime;
}