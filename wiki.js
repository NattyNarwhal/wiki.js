var parse      = require("./format.js");
	fs         = require("fs"),
	path       = require("path"),
	express    = require("express"),
    sprintf = require("sprintf-js");

// Config options
var config = JSON.parse(fs.readFileSync("config.json"));

var wikiTemplate = fs.readFileSync(config.wikiTemplate, "utf8");
var searchTemplate = fs.readFileSync(config.searchTemplate, "utf8");

var server = express();

server.use("/static", express.static(config.staticDir));

// redirect to FrontPage
server.get("/", function(req, res) {
	res.redirect(config.frontPage);
});

server.get("/wiki/:page", function(req, res) {
	var name = req.params.page;
	var fileName = path.join(config.wikiDir, name);
	if (fs.existsSync(fileName))
	{
        if (fs.lstatSync(fileName).isSymbolicLink()) {
            res.set("Location", path.join("/wiki", fs.readlinkSync(fileName)));
            res.sendStatus(302).end();
        } else {
            var f = fs.readFileSync(fileName, "utf8");
            var finalPage = parse.formatTemplate
                (wikiTemplate,
                    [[/%TITLE%/g, name],
                    [/%META%/g, parse.getMtime(fileName)],
                    [/%CONTENT%/g, parse.parsePage(f)]]);
            res.set("Content-Type", "text/html");
            res.send(finalPage).end();
        }
	}
	else
	{
		console.log("[E] no page for " + name);
		res.sendStatus(404).end();
	}
});

server.get("/raw/:page", function(req, res) {
	var name = req.params.page;
	var fileName = path.join(config.wikiDir, name);
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
	var itemsToSearch = fs.readdirSync(config.wikiDir);
	var resultsAsContent = "";
    itemsToSearch.forEach(function (element, index, array) {
        var fn = path.join(config.wikiDir, element);
        var extra = "";
        if (fs.lstatSync(fn).isSymbolicLink()) {
            extra = sprintf.sprintf("(linked to %s)", fs.readlinkSync(fn));
        }
		var f = fs.readFileSync(fn, "utf8");
		if (new RegExp(q).test(f)) {
			resultsAsContent += sprintf.sprintf("<li><a href=\"/wiki/%s\">%s</a> %s</li>", element, element, extra);
		}
	});
    var finalPage = parse.formatTemplate
        (searchTemplate, [[/%TITLE%/g, q ? "Results for " + q : "All pages"], [/%CONTENT%/g ,resultsAsContent]]);
	res.send(finalPage).end();
}

server.get("/search", searchHandler);
server.get("/search/:query", searchHandler);

// TODO: auth, PUT/DELETE

server.listen(3000);
