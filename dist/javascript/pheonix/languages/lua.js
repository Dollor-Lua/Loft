/* File: pheonix/languages/lua.js
 * Description: Syntax Highlighting for the Lua language.
 * Written by: Fynotix
 * License: MIT License, Copyright (c) 2021-present Starlight Interactive
 * License is provided in pheonix's (root) license.txt file.
 */

var total = [];
var text = "";
var comment = false;
var blockComment = false;
var quoteType = 0;
var string = false;

const operators = "-+[]{}~=#^*/%()<>:;,.";
const keywords = [
    "and",
    "break",
    "do",
    "else",
    "elseif",
    "end",
    "false",
    "for",
    "function",
    "if",
    "in",
    "local",
    "nil",
    "not",
    "or",
    "repeat",
    "return",
    "then",
    "true",
    "until",
    "while",
];

const pushText = (override = null, color = null) => {
    if (text != "") {
        var pushing = {
            type: override != null ? override : "text",
            text: text,
        };
        if (color != null) pushing["color"] = color;
        total.push(pushing);
        text = "";
    }
};

const pushTextOverride = () => {
    if (keywords.includes(text.trim())) {
        pushText("keyword");
    } else if (!isNaN(text.trim())) {
        pushText("number");
    } else if (comment) {
        pushText("comment");
    } else if (string) {
        pushText("string");
    } else {
        pushText();
    }
};

function lex(line) {
    const tokens = [];

    const updateTokens = () => {
        if (keywords.includes(text.trim())) {
            tokens.push(["keyword", text]);
            text = "";
            // pushText("keyword");
        } else if (!isNaN(text.trim())) {
            tokens.push(["number", text]);
            text = "";
            // pushText("number");
        } else if (comment) {
            tokens.push(["comment", text]);
            text = "";
            // pushText("comment");
        } else if (string) {
            tokens.push(["string", text]);
            text = "";
            // pushText("string");
        } else {
            tokens.push(["text", text]);
            text = "";
            // pushText();
        }
    };

    for (var i = 0; i < line.length; i++) {
        if (comment) {
            if (blockComment) {
                if (line.charAt(i) == "]" && line.charAt(i + 1) == "]") {
                    blockComment = false;
                    comment = false;
                    text += "]]";
                    i += 1;
                    tokens.push(["comment", text]);
                    text = "";
                    // pushText("comment");
                    continue;
                }
            }

            text += line.charAt(i);
            continue;
        }

        if (string) {
            text += line.charAt(i);
            if (
                ((quoteType == 1 && line.charAt(i) == '"') ||
                    (quoteType == 0 && line.charAt(i) == "'") ||
                    (quoteType == 2 && line.charAt(i) == "]" && line.charAt(i + 1) == "]")) &&
                line.charAt(i - 1) != "\\"
            ) {
                string = false;
                if (quoteType == 2) {
                    text += "]";
                    i++;
                }
            }
            tokens.push(["string", text]);
            text = "";
            // pushText("string");
            continue;
        }

        if (operators.includes(line.charAt(i))) {
            updateTokens();
            if (line.charAt(i) == "[" && line.charAt(i + 1) == "[") {
                quoteType = 2;
                string = true;
                text = "[[";
                i += 1;
                continue;
            }

            if (line.charAt(i) == "-" && line.charAt(i + 1) == "-") {
                comment = true;
                text = "--";
                i += 1;
                if (line.charAt(i + 1) == "[" && line.charAt(i + 2) == "[") {
                    blockComment = true;
                    i += 2;
                    text = "--[[";
                }
                continue;
            }

            tokens.push(["operator", line.charAt(i)]);
            // total.push({
            //     type: "operator",
            //     text: line.charAt(i),
            // });
        } else if (line.charAt(i) == "'") {
            updateTokens();
            quoteType = 0;
            string = true;
            text += "'";
        } else if (line.charAt(i) == '"') {
            updateTokens();
            quoteType = 1;
            string = true;
            text += '"';
        } else if (line.charAt(i) == " ") {
            text += " ";
            if (keywords.includes(text.trim()) || !isNaN(text.trim())) {
                updateTokens();
            }
        } else {
            text += line.charAt(i);
        }
    }

    updateTokens();
    return tokens;
}

function parse(tokens) {
    total = [];

    var token;
    var previousToken;
    for (var i = 0; i < tokens.length; i++) {
        token = tokens[i];

        if (token[0] == "operator" && token[1] == "(") {
            if (previousToken && previousToken[0] == "text") {
                total.pop();
                total.push({ type: "method", text: previousToken[1] });
                total.push({ type: "operator", text: "(" });

                previousToken = token;
                continue;
            }
        } else if (token[0] == "text") {
            if (previousToken && previousToken[0] == "operator" && previousToken[1] == ".") {
                total.push({ type: "attribute", text: token[1] });

                previousToken = token;
                continue;
            }
        }

        total.push({ type: token[0], text: token[1] });
        previousToken = token;
    }
}

function resetVars() {
    total = [];
    text = "";
    comment = false;
    blockComment = false;
    quoteType = 0;
    string = false;
}

function run(line, continues = null, reset = false) {
    if (reset) resetVars(); // reset all variables in case of funny bug

    if (continues == "blockQuote") {
        quoteType = 2;
        string = true;
    } else if (continues == "blockComment") {
        blockComment = true;
        comment = true;
    }

    const tokens = lex(line);
    parse(tokens);

    window.parsed = total;
    window.lexed = tokens;

    pushTextOverride();

    if (comment && !blockComment) comment = false;
    if (string && quoteType != 2) string = false;
    return { highlights: total, continue: string && quoteType == 2 ? "blockQuote" : comment && blockComment ? "blockComment" : null };
}

export default run;
