var	parse   = require("./format.js");
	fs      = require("fs"),
	path    = require("path"),
	express = require("express"),
	marked  = require("marked"),
	sprintf = require("sprintf-js");

// Config options
var wikidir = "./wiki";
var staticdir = "./static";
var frontPage = "/wiki/FrontPage";

var wikiTemplate = fs.readFileSync(path.join(staticdir, "template.wiki.html"), "utf8");
var searchTemplate = fs.readFileSync(path.join(staticdir, "template.search.html"), "utf8");

var server = express();

server.use("/static", express.static(staticdir));

// redirect to FrontPage
server.get("/", function(req, res) {
	res.redirect(frontPage);
});

server.get("/wiki/:page", function(req, res) {
	var name = req.params.page;
	var fileName = path.join(wikidir, name);
	if (fs.existsSync(fileName))
	{
		var f = fs.readFileSync(fileName, "utf8");
		var finalPage = parse.formatTemplate(wikiTemplate, name, parse.getMtime(fileName), parse.parsePage(f));
		res.set("Content-Type", "text/html");
		res.send(finalPage).end();
	}
	else
	{
		console.log("[E] no page for " + name);
		res.sendStatus(404).end();
	}
});

server.get("/raw/:page", function(req, res) {
	var name = req.params.page;
	var fileName = path.join(wikidir, name);
	if (fs.existsSync(fileName))
	{
		var f = fs.readFileSync(fileName, "utf8");
		res.set("Content-Type", "text/plain");
		res.send(f).end();
	}
	else
	{
		console.log("[E] no page for " + name);
		res.sendStatus(404).end();
	}
});

// because pages are linked via CamelCase, a search can be used
// for "what links to" - this is how c2 does it
var searchHandler = function (req, res) {
	var q = req.params.query || req.query.q;
	var itemsToSearch = fs.readdirSync(wikidir);
	var resultsAsContent = "";
	itemsToSearch.forEach(function (element, index, array) {
		var f = fs.readFileSync(path.join(wikidir, element), "utf8");
		if (new RegExp(q).test(f)) {
			resultsAsContent += sprintf.sprintf("<li><a href=\"%s\">%s</a></li>", element, element);
		}
	});
	var finalPage = parse.formatTemplate(searchTemplate, "Results for " + q, null, resultsAsContent);
	res.send(finalPage).end();
}

server.get("/search", searchHandler);
server.get("/search/:query", searchHandler);

server.get("/wiki", function (req, res) {
	var itemsToSearch = fs.readdirSync(wikidir);
	var resultsAsContent = "";
	itemsToSearch.forEach(function (element, index, array) {
		resultsAsContent += sprintf.sprintf("<li><a href=\"%s\">%s</a></li>", element, element);
	});
	var finalPage = parse.formatTemplate(searchTemplate, "All pages", null, resultsAsContent);
	res.send(finalPage).end();
});

// TODO: auth, PUT/DELETE

server.listen(3000);
