var fs   = require("fs"),
	path = require("path");

var tmplfile = "./template.html"; //configurable

var camelCase = /[A-Z][a-z]*[A-Z][a-z]*\b/g;
var link = "[$&]($&)";

var template = fs.readFileSync(tmplfile, "utf8");

exports.formatTemplate = function(title, date, content) {
	var mTitle = /%TITLE%/g;
	var mDate = /%MOD%/g;
	var mContent = /%CONTENT%/g;
	return template.replace(mTitle, title).
			replace(mDate, date).
			replace(mContent, content);
}

exports.parsePage = function(content) {
	return marked(content.replace(camelCase, link));
}

exports.getMtime = function(fileName) {
	return fs.statSync(fileName).mtime;
}