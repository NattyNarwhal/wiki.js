var	fs      = require("fs"),
	path    = require("path"),
	express = require("express"),
	marked  = require("marked");

// Config options
var wikidir = "./wiki";
var staticdir = "./static";
var tmplfile = "./template.html";
var frontPage = "/wiki/FrontPage";

var camelCase = /[A-Z][a-z]*[A-Z][a-z]*\b/g;
var link = "[$&]($&)";

var template = fs.readFileSync(tmplfile, "utf8");

function formatTemplate(title, date, content)
{
	var mTitle = /%TITLE%/g;
	var mDate = /%MOD%/g;
	var mContent = /%CONTENT%/g;
	return template.replace(mTitle, title).
			replace(mDate, date).
			replace(mContent, content);
}

function parsePage(content)
{
	return marked(content.replace(camelCase, link));
}

function getMtime(fileName)
{
	return fs.statSync(fileName).mtime;
}

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
		var finalPage = formatTemplate
			(name, getMtime(fileName), parsePage(f));
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

// TODO: auth, PUT/DELETE

server.listen(3000);
