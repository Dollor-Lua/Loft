// TAURI imports
const { dialog, fs, clipboard } = window.__TAURI__;

// imports
import { generate } from "./generator.js";

// languages
import lua from "./languages/lua.js";

const dialogFilters = [
    {
        extensions: ["js", "cjs", "mjs", "es6", "pac"],
        name: "JavaScript",
    },
    {
        extensions: ["cc", "cpp"],
        name: "C++",
    },
    {
        extensions: ["c"],
        name: "C",
    },
];

var selected = null;

const fontHeight = 24;

var updated = false;
var cursor_blink = setInterval(() => {
    if (updated) {
        updated = false;
        return;
    }

    if (selected != null) {
        if (selected.cursor.classList.contains("disabled-t")) {
            selected.cursor.classList.remove("disabled-t");
        } else {
            selected.cursor.classList.add("disabled-t");
        }
    }
}, 500);

export function getPositionFromLineAndChar(text, line, char) {
    var total = 0;
    const split = text.split("\n");
    for (var index = 0; index < line; index++) {
        if (split[index]) {
            total += split[index].length + 1;
        }
    }

    total += char;

    return total;
}

export function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

export function cap(fallback = null) {
    const spl = selected.text.split("\n");

    if (selected.c_char < 0) {
        selected.c_line--;
        if (selected.c_line < 0) {
            selected.c_char = 0;
            selected.c_line = 0;
        } else {
            selected.c_char = fallback;
        }
    }

    if (spl[selected.c_line] == null || selected.c_char > spl[selected.c_line].length) {
        if (selected.c_line < spl.length - 1) {
            selected.c_line++;
            selected.c_char = 0;
        }
    }

    if (spl[selected.c_line] == null || selected.c_char > spl[selected.c_line].length) {
        selected.c_char = fallback != null ? fallback : spl[selected.c_line] ? spl[selected.c_line].length : spl[spl.length].length;
    }

    // for selection ends
    if (selected.c_char_end < 0) {
        selected.c_line_end--;
        if (selected.c_line_end < 0) {
            selected.c_char_end = 0;
            selected.c_line_end = 0;
        } else {
            selected.c_char_end = fallback;
        }
    }

    if (spl[selected.c_line_end] == null || selected.c_char_end > spl[selected.c_line_end].length) {
        if (selected.c_line_end < spl.length - 1) {
            selected.c_line_end++;
            selected.c_char_end = 0;
        }
    }

    if (spl[selected.c_line_end] == null || selected.c_char_end > spl[selected.c_line_end].length) {
        selected.c_char_end = fallback != null ? fallback : spl[selected.c_line_end] ? spl[selected.c_line_end].length : spl[spl.length - 1].length;
    }

    update(selected);
}

const title = document.getElementById("title");
const cbuffer = document.getElementById("editor.current_buffer");
const linenum = document.getElementById("editor.select");

export function getcharwidth() {
    const exspan = document.createElement("span");
    exspan.style = `position: absolute; display: block; top: -100px; height: ${fontHeight}px; width: fit-content; font-size: ${fontHeight - 2}px;`;
    exspan.innerText = "W"; // W is one of the longest characters, although this should be monospaced.
    document.body.appendChild(exspan);
    const width = exspan.getBoundingClientRect().width;
    document.body.removeChild(exspan);

    return width;
}

export function update($) {
    const width = getcharwidth();

    const editor = $.editor;
    const hints = $.hints;

    const preview = $.showPreview && $.text.trim() == "";
    const txt = preview ? $.previewText : $.text;
    const lines = txt.split("\n");
    $.lines.innerHTML = "";
    $.presentation.innerHTML = "";
    for (var line = 1; line <= (preview ? 1 : lines.length); line++) {
        const d = document.createElement("div");
        d.classList.add("pheonix-line-number");
        d.style = `text-align: right; user-select: none; width: 100%; height: ${fontHeight}px; top: ${(line - 1) * fontHeight}px; font-size: ${
            fontHeight - 2
        }px; position: absolute;`;
        d.innerText = line;
        $.lines.appendChild(d);
    }

    editor.innerHTML = "";
    hints.innerHTML = "";

    var lineContinues = null;
    for (var l = 0; l < lines.length; l++) {
        const line = lines[l];
        // split line here to generate words
        const lined = document.createElement("span");
        lined.classList.add("pheonix-line");
        lined.style = `width: 100%; height: ${fontHeight}px; position: absolute; top: ${l * fontHeight}px; user-select: none;`;
        lined.setAttribute("pheonix-line-num", `${l}`);

        const lineContentsPre = preview ? { highlights: [{ type: "text", text: line }] } : lua(line, lineContinues);
        const lineContents = lineContentsPre.highlights;
        lineContinues = lineContentsPre.continue;

        var last = null;
        for (const lc of lineContents) {
            var span;
            if (lc.text.trim() == "" && last) {
                last.innerText += lc.text;
                continue;
            } else if (last && last.innerText.trim() == "") {
                span = last;
                span.className = "";
            } else {
                span = document.createElement("span");
            }

            span.style = `height: ${fontHeight}px; font-size: ${
                fontHeight - 2
            }px; width: fit-content; display: inline-block; user-select: none; color: ${preview ? "var(--hint-color);" : "var(--text-color);"}`;

            span.classList.add(`pheonix-typewrite-${lc.type}`, `pheonix-${lc.type}`);

            if (lc.type == "text") span.classList.add("px*");
            if (lc.color) span.style.color = lc.color;

            span.innerText += lc.text;
            span.setAttribute("pheonix-line-num", `${l}`);

            if (preview) span.setAttribute("pheonix-preview-hint", `true`);
            lined.appendChild(span);

            last = span;
        }

        if (preview) hints.appendChild(lined);
        else editor.appendChild(lined);
    }

    updated = true;
    if (selected === $) {
        $.cursor.classList.remove("disabled-t");
        $.cursor.style = `display: block; background-color: var(--cursor-color); width: 2px; height: ${fontHeight}px; position: absolute; left: 
        ${75 + width * $.c_char}px; top: ${fontHeight * $.c_line}px;`;

        //
        // LINE SELECTION AND LN NUM, COL NUM (X SELECTED) HANDLERS!
        //

        const lnp1 = getPositionFromLineAndChar($.text, $.c_line, $.c_char);
        const lnp2 = getPositionFromLineAndChar($.text, $.c_line_end, $.c_char_end);
        const diff = Math.max(lnp1, lnp2) - Math.min(lnp1, lnp2);
        linenum.innerText = `Ln ${$.c_line + 1}, Col ${$.c_char + 1} ${$.c_selecting ? `(${diff} selected)` : ""}`;

        if ($.c_selecting) {
            const lineDivs = [];
            for (var i = 0; i < Math.max($.c_line, $.c_line_end) - Math.min($.c_line, $.c_line_end) + 1; i++) {
                const div = document.createElement("div");
                div.classList.add("pheonix-selection-div");

                lineDivs.push(div);
            }

            for (var i = 0; i < lineDivs.length; i++) {
                const lineNum = Math.min($.c_line, $.c_line_end) + i;
                const element = lineDivs[i];

                const minChar = Math.min($.c_line, $.c_line_end) == $.c_line_end ? $.c_char_end : $.c_char;
                const maxChar = minChar == $.c_char_end ? $.c_char : $.c_char_end;

                if ($.text.split("\n")[lineNum]) {
                    var elementWidth =
                        i == 0
                            ? `${($.text.split("\n")[lineNum].length - minChar) * width}px`
                            : i == lineDivs.length - 1
                            ? `${maxChar * width}px`
                            : `${$.text.split("\n")[lineNum].length * width}px`;
                }

                var elementLeft = i == 0 ? `left: ${minChar * width}px;` : "";

                if ($.c_line == $.c_line_end) {
                    elementWidth = `${diff * width}px`;
                    elementLeft = `left: ${Math.min($.c_char, $.c_char_end) * width}px;`;
                }

                element.style = `height: ${fontHeight}px; background-color: #ffffff33; top: ${
                    fontHeight * lineNum
                }px; position: absolute; ${elementLeft}width: ${elementWidth};`;

                $.presentation.appendChild(element);
            }
        }

        // titling, etc

        const spl1 = selected.file.split("/").join("\\").split("\\");
        const filename = spl1[spl1.length - 1].trim() != "" ? spl1[spl1.length - 1].trim() : "Untitled";
        if (selected.presave != selected.text) {
            title.innerText = "• " + filename + " - Loft";
            cbuffer.innerText = "• " + filename;
        } else {
            title.innerText = filename + " - Loft";
            cbuffer.innerText = filename;
        }
    } else {
        $.cursor.classList.add("disabled-t");
    }
}

document.addEventListener("keydown", async function (e) {
    if (selected) {
        if (e.getModifierState("Control") || e.getModifierState("Meta")) {
            if (e.key.toLowerCase() == "s") {
                if (selected != null) {
                    if (selected.file.trim() != "") {
                        if (selected.presave != selected.text) {
                            fs.writeFile({
                                contents: selected.text,
                                path: selected.file.trim(),
                            });
                            selected.presave = selected.text;
                        }
                    } else {
                        dialog.save({ title: "Save As", filters: dialogFilters }).then((path) => {
                            fs.writeFile({ contents: selected.text, path: path });
                            selected.presave = selected.text;
                        });
                    }
                }
            } else if (e.key.toLowerCase() == "a") {
                if (selected != null) {
                    const split = selected.text.split("\n");
                    selected.c_char = 0;
                    selected.c_line = 0;
                    selected.c_char_end = split[split.length - 1].length;
                    selected.c_line_end = split.length - 1;
                    selected.c_selecting = true;
                }
            } else if (e.key.toLowerCase() == "c") {
                if (selected.c_selecting) {
                    const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
                    const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
                    await clipboard.writeText(selected.text.substring(Math.min(lnp1, lnp2), Math.max(lnp1, lnp2)));
                    selected.c_selecting = false;
                } else {
                    await clipboard.writeText(selected.text.split("\n")[selected.c_line] + "\n");
                }
                cap();
            } else if (e.key.toLowerCase() == "x") {
                selected.history.push(selected.text, "cut", selected.c_line, selected.c_char, selected.c_line_end, selected.c_char_end);
                if (selected.c_selecting) {
                    const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
                    const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
                    await clipboard.writeText(selected.text.substring(Math.min(lnp1, lnp2), Math.max(lnp1, lnp2)));
                    selected.text = selected.text.substring(0, Math.min(lnp1, lnp2)) + selected.text.substring(Math.max(lnp1, lnp2));
                    selected.c_selecting = false;
                } else {
                    await clipboard.writeText(selected.text.split("\n")[selected.c_line] + "\n");
                    const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, 0);
                    const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.text.split("\n")[selected.c_line].length + 1);
                    selected.text = selected.text.substring(0, lnp1) + selected.text.substring(lnp2);
                }
                cap();
            } else if (e.key.toLowerCase() == "v") {
                const read = await clipboard.readText();
                if (read != null) {
                    selected.history.push(selected.text, "paste", selected.c_line, selected.c_char, selected.c_line_end, selected.c_char_end);
                    if (selected.c_selecting) {
                        const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
                        const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);

                        selected.text = selected.text.substring(0, Math.min(lnp1, lnp2)) + read + selected.text.substring(Math.max(lnp1, lnp2));
                        selected.c_line = Math.min(selected.c_line, selected.c_line_end);
                        selected.c_char = Math.min(selected.c_char, selected.c_char_end) + read.length;
                    } else {
                        const toadd = selected.text.split("\n");
                        var add = 0;
                        for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
                        selected.text = selected.text.substring(0, add + selected.c_char) + read + selected.text.substring(add + selected.c_char);
                        selected.c_char += read.length;
                    }
                }
                cap();
            } else if (e.key.toLowerCase() == "p") {
                // show command palette
            } else if (e.key.toLowerCase() == "z") {
                if (e.getModifierState("Shift")) {
                    const content = selected.history.redo();
                    if (content) {
                        selected.text = content.text;
                        selected.c_line = content.line;
                        selected.c_char = content.char;
                        selected.c_line_end = content.line_end;
                        selected.c_char_end = content.char_end;
                    }
                } else {
                    const content = selected.history.undo();
                    if (content) {
                        selected.text = content.text;
                        selected.c_line = content.line;
                        selected.c_char = content.char;
                        selected.c_line_end = content.line_end;
                        selected.c_char_end = content.char_end;
                    }
                }
            } else if (e.key.toLowerCase() == "y") {
                const content = selected.history.redo();
                if (content) {
                    selected.text = content.text;
                    selected.c_line = content.line;
                    selected.c_char = content.char;
                    selected.c_line_end = content.line_end;
                    selected.c_char_end = content.char_end;
                }
            }
            update(selected);
            return;
        } else if (e.getModifierState("Shift")) {
            if (e.key == "ArrowLeft") {
                if (!selected.c_selecting) {
                    selected.c_selecting = true;
                    selected.c_char_end = selected.c_char;
                    selected.c_line_end = selected.c_line;
                }

                selected.c_char_end--;
                cap(selected.text.split("\n")[selected.c_line_end - 1] ? selected.text.split("\n")[selected.c_line_end - 1].length : 0);
                update(selected);
                return;
            } else if (e.key == "ArrowRight") {
                if (!selected.c_selecting) {
                    selected.c_selecting = true;
                    selected.c_char_end = selected.c_char;
                    selected.c_line_end = selected.c_line;
                }

                selected.c_char_end++;
                cap();
                update(selected);
                return;
            } else if (e.key == "ArrowDown") {
                if (!selected.c_selecting) {
                    selected.c_selecting = true;
                    selected.c_char_end = selected.c_char;
                    selected.c_line_end = selected.c_line;
                }

                if (selected.c_line_end < selected.text.split("\n").length - 1) {
                    selected.c_line_end++;
                    selected.c_char_end = Math.min(selected.text.split("\n")[selected.c_line_end].length, selected.c_char_end);
                } else {
                    selected.c_char_end = selected.text.split("\n")[selected.c_line_end].length;
                }
                update(selected);
                return;
            } else if (e.key == "ArrowUp") {
                if (!selected.c_selecting) {
                    selected.c_selecting = true;
                    selected.c_char_end = selected.c_char;
                    selected.c_line_end = selected.c_line;
                }

                if (selected.c_line_end > 0) {
                    selected.c_line_end--;
                    selected.c_char_end = Math.min(selected.text.split("\n")[selected.c_line_end].length, selected.c_char_end);
                } else {
                    selected.c_char_end = 0;
                }
                update(selected);
                return;
            }
        }

        if (e.key == "ArrowLeft") {
            selected.c_char--;
            cap(selected.text.split("\n")[selected.c_line - 1] ? selected.text.split("\n")[selected.c_line - 1].length : 0);
            selected.c_selecting = false;
        } else if (e.key == "ArrowRight") {
            selected.c_char++;
            selected.c_selecting = false;
            cap();
        } else if (e.key == "ArrowDown") {
            if (selected.c_line < selected.text.split("\n").length - 1) {
                selected.c_line++;
                selected.c_char = Math.min(selected.text.split("\n")[selected.c_line].length, selected.c_char);
            } else {
                selected.c_char = selected.text.split("\n")[selected.c_line].length;
            }
            selected.c_selecting = false;
        } else if (e.key == "ArrowUp") {
            if (selected.c_line > 0) {
                selected.c_line--;
                selected.c_char = Math.min(selected.text.split("\n")[selected.c_line].length, selected.c_char);
            } else {
                selected.c_char = 0;
            }
            selected.c_selecting = false;
        } else if (e.key == "Enter" || e.key == "Return") {
            selected.history.push(selected.text, "write", selected.c_line, selected.c_char, selected.c_line_end, selected.c_char_end);
            if (!selected.c_selecting) {
                const toadd = selected.text.split("\n");
                var add = 0;
                for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
                selected.text = selected.text.substring(0, add + selected.c_char) + "\n" + selected.text.substring(add + selected.c_char);
                selected.c_char = 0;
                selected.c_line++;
            } else {
                const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
                const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
                selected.text = selected.text.substring(0, Math.min(lnp1, lnp2)) + "\n" + selected.text.substring(Math.max(lnp1, lnp2));
                selected.c_line = Math.min(selected.c_line, selected.c_line_end);
                selected.c_char = Math.min(selected.c_char, selected.c_char_end) + 1;
                cap();
            }

            selected.c_selecting = false;
        } else if (e.key == "Backspace") {
            selected.history.push(selected.text, "write", selected.c_line, selected.c_char, selected.c_line_end, selected.c_char_end);
            if (!selected.c_selecting) {
                const toadd = selected.text.split("\n");
                var add = 0;
                for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
                const oldlastline = toadd[selected.c_line - 1];
                selected.text = selected.text.substring(0, add + selected.c_char - 1) + selected.text.substring(add + selected.c_char);
                selected.c_char--;
                cap(oldlastline != null ? oldlastline.length : 0);
            } else {
                const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
                const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
                selected.text = selected.text.substring(0, Math.min(lnp1, lnp2)) + selected.text.substring(Math.max(lnp1, lnp2));
                selected.c_line = Math.min(selected.c_line, selected.c_line_end);
                selected.c_char = Math.min(selected.c_char, selected.c_char_end);
                cap();
            }
            selected.c_selecting = false;
        } else if (e.key == "Home") {
            selected.c_char = 0;
            selected.c_selecting = false;
        } else if (e.key == "End") {
            selected.c_char = selected.text.split("\n")[selected.c_line].length;
            cap(selected.text.split("\n")[selected.c_line] ? selected.text.split("\n")[selected.c_line].length : 0);
            selected.c_selecting = false;
        } else if (e.key == "PageDown") {
            selected.c_line += 20;
            selected.c_line = clamp(selected.c_line, 0, selected.text.split("\n").length - 1);
            selected.c_char = Math.min(selected.text.split("\n")[selected.c_line].length, selected.c_char);
            selected.c_selecting = false;
        } else if (e.key == "PageUp") {
            selected.c_line -= 20;
            selected.c_line = clamp(selected.c_line, 0, selected.text.split("\n").length - 1);
            selected.c_char = Math.min(selected.text.split("\n")[selected.c_line].length, selected.c_char);
            selected.c_selecting = false;
        }
        // actual typing
        // checks modifiers too
        else if (e.key.substring(0, 1) == e.key) {
            selected.history.push(selected.text, "write", selected.c_line, selected.c_char, selected.c_line_end, selected.c_char_end);
            if (!selected.c_selecting) {
                const toadd = selected.text.split("\n");
                var add = 0;
                for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
                selected.text = selected.text.substring(0, add + selected.c_char) + e.key + selected.text.substring(add + selected.c_char);
                selected.c_char++;
            } else {
                const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
                const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
                selected.text = selected.text.substring(0, Math.min(lnp1, lnp2)) + e.key + selected.text.substring(Math.max(lnp1, lnp2));
                selected.c_line = Math.min(selected.c_line, selected.c_line_end);
                selected.c_char = Math.min(selected.c_char, selected.c_char_end) + 1;
                cap();
            }

            selected.c_selecting = false;
        }

        update(selected);
    }
});

export default function build(container, relative) {
    const $ = generate(container, relative);
    selected = $;
    update($);

    document.addEventListener("mousedown", function (e) {
        if (e.target === $.main || $.main.contains(e.target)) {
            selected = $;
            const cw = e.target.classList.contains("pheonix-cursor") ? selected.c_char : Math.round(e.offsetX / getcharwidth());
            const hw =
                e.target.hasAttribute("pheonix-line-num") && !e.target.hasAttribute("pheonix-preview-hint")
                    ? e.target.getAttribute("pheonix-line-num")
                    : e.target.classList.contains("pheonix-cursor")
                    ? selected.c_line
                    : selected.text.split("\n").length - 1;
            selected.c_char = Math.min(cw, $.text.split("\n")[parseInt(hw)].length);
            selected.c_line = parseInt(hw);

            selected.c_selecting = false;
            update(selected);
            cap();

            selected.mousedown = true;
        } else {
            selected = null;
            update($);
        }
    });

    document.addEventListener("mouseup", function (e) {
        if (selected) {
            selected.mousedown = false;
        }
    });

    document.addEventListener("mousemove", function (e) {
        if (selected) {
            if (selected.mousedown) {
                const cw = Math.floor(e.offsetX / getcharwidth());
                const hw =
                    e.target.hasAttribute("pheonix-line-num") && !e.target.hasAttribute("pheonix-preview-hint")
                        ? e.target.getAttribute("pheonix-line-num")
                        : selected.text.split("\n").length - 1;
                selected.c_char_end = Math.min(cw, $.text.split("\n")[hw].length);
                selected.c_line_end = parseInt(hw);

                selected.c_selecting = false;
                if (selected.c_char_end != selected.c_char || selected.c_line_end != selected.c_line) {
                    selected.c_selecting = true;
                }

                update(selected);
                cap();
            }
        }
    });

    $.addlistener("pheonix://updated", () => {
        update($);
    });

    return $;
}
