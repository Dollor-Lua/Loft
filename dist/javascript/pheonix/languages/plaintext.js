/* File: pheonix/languages/plaintext.js
 * Description: Bypass highlighting for plaintext, repipe lines without modifying the code and cluttering it.
 * Written by: Fynotix
 * License: MIT License, Copyright (c) 2021-present Starlight Interactive
 * License is provided in pheonix's (root) license.txt file.
 */

function parse(line, continues = null, reset = false) {
    const total = [
        {
            type: "text",
            text: line,
        },
    ];

    return { highlights: total, continue: null };
}

export default parse;
