// Config options
var config = { tocTreshold: 3, wikiDir: "/raw/" };

var ajax = new XMLHttpRequest();
var linkState = {};

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
    if (href.match(discreteCamelCase)) {
        if (linkState[href] == null) {
            ajax.onreadystatechange = function () {
                if (ajax.readyState == 4) {
                    linkState[href] = ajax.status == 200;
                }
            }
            ajax.open("HEAD", config.wikiDir + href, false);
            ajax.send(null);
        }
        if (linkState[href] == false) {
            out += ' class="redlink"';
        }
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

function makeLinks(match, offset, whole) {
    var final = match;
    final = sprintf(link, final, match);
    return final;
}

function parsePage(content) {
    var lexicon = marked.lexer(content);
    lexicon.map(function (element) {
        if (element.type == "paragraph") {
            element.text = element.text.replace(camelCase, makeLinks);
        }
    });
    return this.makeToc(lexicon, config.tocTreshold) + marked.parser(lexicon);
}

function makeToc(lex, treshold) {
    var depth = 0;
    var initDepth = 0;
    var amount = 0;
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
            html += sprintf("<li><a href=\"#%s\">%s</a></li>",
                element.text.toLowerCase().replace(/[^\w]+/g, '-'), element.text);
        }
    });
    if (depth > initDepth) html += "</ul>";
    html += "</ul>";
    return amount > treshold ? html : "";
}

function textAreaAdjust(o) {
    o.style.height = "1px";
    o.style.height = (25 + o.scrollHeight) + "px";
}

function update(o) {
    document.getElementById("preview").innerHTML =
        parsePage(o.innerText);
}