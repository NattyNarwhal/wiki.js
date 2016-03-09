var parse          = require("./format.js");
	fs             = require("fs"),
	path           = require("path"),
	express        = require("express"),
    sprintf        = require("sprintf-js"),
    bodyParser     = require("body-parser"),
    passport       = require("passport"),
    passportHttp   = require("passport-http");

// Config options
var config = JSON.parse(fs.readFileSync("config.json"));

var wikiTemplate = fs.readFileSync(config.wikiTemplate, "utf8");
var searchTemplate = fs.readFileSync(config.searchTemplate, "utf8");
var editorTemplate = fs.readFileSync(config.editorTemplate, "utf8");
var renameTemplate = fs.readFileSync(config.renameTemplate, "utf8");

var server = express();

// passport.authenticate('digest', { session: false }),
passport.use(new passportHttp.DigestStrategy({ qop: "auth" },
    function (username, cb) {
        return cb(null, config.user, config.password);
}));

var urlencodedParser = bodyParser.urlencoded({ extended: false });

server.use("/static", express.static(config.staticDir));

// redirect to FrontPage
server.get("/", function(req, res) {
	res.redirect(config.frontPage);
});

server.get("/wiki/:page", function(req, res) {
	var name = req.params.page;
    var fileName = path.join(config.wikiDir, name);
    
    fs.lstat(fileName, function (err, stats) {
        if (err && err.code == "ENOENT") {
            res.set("Location", path.join("/edit", name));
            res.sendStatus(307).end();
        } else if (err) {
            res.sendStatus(500).end();
        }
        
        if (stats.isSymbolicLink()) {
            res.set("Location", path.join("/wiki", fs.readlinkSync(fileName)));
            res.sendStatus(302).end();
        } else {
            var f = fs.readFileSync(fileName, "utf8");
            var finalPage = parse.formatTemplate
                (wikiTemplate,
                    [[/%TITLE%/g, name],
                    [/%META%/g, parse.getMtime(fileName)],
                    [/%CONTENT%/g, parse.parsePage(f)]]);
            res.send(finalPage).end();
        }
    });
});

server.get("/raw/:page", function(req, res) {
	var name = req.params.page;
    var fileName = path.join(config.wikiDir, name);
    
    fs.lstat(fileName, function (err, stats) {
        if (err && err.code == "ENOENT") {
            res.sendStatus(404).end();
        } else if (err) {
            res.sendStatus(500).end();
        }
        
        if (stats.isSymbolicLink()) {
            res.set("Location", path.join("/raw", fs.readlinkSync(fileName)));
            res.sendStatus(307).end();
        } else {
            var f = fs.readFileSync(fileName, "utf8");
            res.set("Content-Type", "text/plain");
            res.send(f).end();
        }
    });
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
        if (fs.existsSync(fn)) {
            var f = fs.readFileSync(fn, "utf8");
            if (new RegExp(q).test(f)) {
                resultsAsContent += sprintf.sprintf("<li><a href=\"/wiki/%s\">%s</a> %s</li>", element, element, extra);
            }
        }
	});
    var finalPage = parse.formatTemplate
        (searchTemplate, [[/%TITLE%/g, q ? "Results for " + q : "All pages"], [/%CONTENT%/g ,resultsAsContent]]);
	res.send(finalPage).end();
}

server.get("/search", searchHandler);
server.get("/search/:query", searchHandler);

server.get("/edit/:page", passport.authenticate('digest', { session: false }), function (req, res) {
    var name = req.params.page;
    var fileName = path.join(config.wikiDir, name);
    var f = "";
    var exists = false;
    
    fs.lstat(fileName, function (err, stats) {
        if (stats && stats.isSymbolicLink()) {
            res.set("Location", path.join("/edit", fs.readlinkSync(fileName)));
            res.sendStatus(302).end();
        } else if (fs.existsSync(fileName)) {
            exists = true;
            f = fs.readFileSync(fileName, "utf8");
        }

        var finalPage = parse.formatTemplate(editorTemplate,
            [[/%TITLE%/g, name],
            [/%META%/g, exists ? "" : "(new page)"],
            [/%CONTENT%/g, f]]);
        res.set("Content-Type", "text/html");
        res.send(finalPage).end();
    });
});

var editHandler = function (req, res) {
    if (!req.body) return res.sendStatus(400);
    
    var name = req.params.page;
    var fileName = path.join(config.wikiDir, name);
    fs.writeFile(fileName, req.body.text, "utf8", function (err) {
        if (err) {
            res.sendStatus(500).end();
            throw err;
        } else {
            res.set("Location", path.join("/wiki", name));
            res.sendStatus(302).end();
        }
    });
}

server.post("/edit/:page", urlencodedParser, passport.authenticate('digest', { session: false }), editHandler);
server.post("/wiki/:page", urlencodedParser, passport.authenticate('digest', { session: false }), editHandler);

var deleteHandler = function (req, res) {
    var name = req.params.page;
    var fileName = path.join(config.wikiDir, name);
    
    fs.lstat(fileName, function (err, stats) {
        if (err && err.code == "ENOENT") {
            res.sendStatus(404).end();
        } else if (err) {
            res.sendStatus(500).end();
        }
        fs.unlink(fileName, function (err) {
            if (err) {
                res.sendStatus(500).end();
            } else {
                res.set("Location", "/");
                res.sendStatus(302).end();
            }
        });
    });
}

server.delete("/edit/:page", passport.authenticate('digest', { session: false }), deleteHandler);
server.delete("/wiki/:page", passport.authenticate('digest', { session: false }), deleteHandler);
server.get("/delete/:page", passport.authenticate('digest', { session: false }), deleteHandler);

server.get("/rename/:page", passport.authenticate('digest', { session: false }), function (req, res) {
    var name = req.params.page;
    var fileName = path.join(config.wikiDir, name);
    var meta = "";
    fs.lstat(fileName, function (err, stats) {
        if (err && err.code == "ENOENT") {
            res.sendStatus(404).end();
        }
        else if (err) {
            res.sendStatus(500).end();
        }
        if (stats.isSymbolicLink()) {
            meta = sprintf.sprintf("(link to %s)", fs.readlinkSync(fileName));
        }
        var finalPage = parse.formatTemplate(renameTemplate,
        [[/%TITLE%/g, name], [/%META%/g, meta]]);
        res.send(finalPage).end();
    });
});

server.post("/rename/:page", urlencodedParser, passport.authenticate('digest', { session: false }), function (req, res) {
    var name = req.params.page;
    var fileName = path.join(config.wikiDir, name);
    var target = req.body.target;
    var targetPath = path.join(config.wikiDir, req.body.target);

    if (!target || fileName == targetPath) {
        res.sendStatus(400).end();
    }

    if (!fs.existsSync(fileName)) {
        res.sendStatus(404).end();
    } else if (fs.existsSync(targetPath)) {
        res.sendStatus(403).end();
    }

    fs.rename(fileName, targetPath, function (err) {
        if (err) {
            res.sendStatus(500).end();
        }
        res.set("Location", path.join("/wiki", target));
        res.sendStatus(302).end();
    });
});

server.listen(3000);
