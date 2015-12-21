var	fs         = require("fs"),
    path       = require("path"),
    marked     = require("marked"),
    sprintf    = require("sprintf-js");

marked.setOptions({
    sanitize: true,
});

var camelCase = /[A-Z][a-z]*[A-Z][a-z]*\b/g;
var link = "[$&]($&)";

exports.formatTemplate = function(template, title, meta, content) {
	var mTitle = /%TITLE%/g;
	var mMeta = /%META%/g;
	var mContent = /%CONTENT%/g;
	return template.replace(mTitle, title).
			replace(mMeta, meta).
			replace(mContent, content);
}

exports.parsePage = function(content) {
	return marked(content.replace(camelCase, link));
}

exports.getMtime = function(fileName) {
	return fs.statSync(fileName).mtime;
}