/* File: pheonix/languages/[LANGUAGE].js
 * Description: Syntax Highlighting for the [LANGUAGE] language.
 * Written by: [YOUR NAME]
 * License: MIT License, Copyright (c) 2021-present Starlight Interactive
 * License is provided in pheonix's (root) license.txt file.
 */

// line - the text content of the line that needs to be highlighted
// continues - info from the previous line for if it needs to continue something to this line (like a block comment)
//           - continues is provided by the return at the bottom of the parse function

// `total` should look something like this:
// [
//     {
//         type: string ("operator", "keyword", "method", "attribute", "number", "string", "comment", "text")
//         text: string
//         color: string? (hex rgb, ex: "#ffffff", "rgb(255, 255, 255)")
//     }
// ]

// each dictionary including type and text are separate elements defining a partial.
// for example a keyword like "local" would be: {type: "keyword", text: "local"}
// and in a line like "local x = 1 + 2" it would be: [{type: "keyword", text: "local"}, {type: "text", text: "x"}, ...]
// try your best to optimize it, although if you dont usually the main script can optimize for you.
// optimizations should include connecting spaces to text so instead of just "local" you would have "local " and "x ", etc.

function parse(line, continues = null) {
    const total = [];

    var text = "";

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

    for (var i = 0; i < line.length; i++) {
        text += line.charAt(i);
    }

    pushText();

    return { highlights: total, continue: null };
}

export default parse;
