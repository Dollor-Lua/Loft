// TAURI imports
const { dialog, fs, clipboard } = window.__TAURI__;
const { appWindow } = window.__TAURI__.window;

// imports
import { generate, autocompletionResult } from "./generator.js";
import languages from "./langs.js";
import fuzzysort from "./external/fuzzysort.js";

// languages
var syntaxCache = {};
var serverCache = {};

var paletteLangs = [];
var highlight = null;
var langserver = null;
(async () => {
    highlight = (await import("./languages/plaintext.js")).default;
})();

// dialog filters
// TODO: make automatic
const dialogFilters = [
    {
        extensions: ["lua"],
        name: "Lua",
    },
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

/**
 * onrun: function()
 * @return {Array} [skipClosePalette, skipReloadLang]
 */
const commands = [
    {
        name: "Change Language",
        identifier: "fyre.cmd.change_language",
        accel: "Ctrl + L",
        accelMac: "Cmd + L",
        onrun: async function () {
            closePalette();
            openPalette("language");

            return [true, true];
        },
    },
    {
        name: "Dev: Reload Window",
        identifier: "fyre.dev.reload",
        accel: "Ctrl + R",
        accelMac: "Cmd + R",
        onrun: async function () {
            location.reload();
            return [false, false];
        },
    },
    {
        name: "Close Window",
        identifier: "fyre.cmd.close",
        accel: "Alt + F4",
        accelMac: "Cmd + Q",
        onrun: async function () {
            appWindow.close();
            return [false, false];
        },
    },
    {
        name: "Open Folder",
        identifier: "fyre.files.open_folder",
        accel: "Ctrl + O",
        accelMac: "Cmd + O",
        onrun: async function () {
            const folder = await dialog.open({ directory: true, multiple: false });
            openFolder(folder);
            return [false, false];
        },
    },
];

const fileContainer = document.getElementById("file-container");
const title = document.getElementById("title");
const cbuffer = document.getElementById("editor.current_buffer");
const linenum = document.getElementById("editor.select");
const mode = document.getElementById("editor.mode");

// basic variables
var currentFiles = [];

var selected = null;
var paletteOpen = false;
var currentMode = "plaintext";
var lastMode = "plaintext";

var allowbindings = true;
var intellishow = false;

const paletteManager = new EventTarget();
const intelliManager = new EventTarget();

const fontHeight = 24;

// functions
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

var paletteholder = null;

var signalpalette = null;
var incpalette = null;
var deincpalette = null;

var titleText = "";

const palette = document.getElementById("palette");
const paletteContainer = document.getElementById("palette-options");

export function closePalette() {
    paletteOpen = false;
    allowbindings = true;
    paletteManager.removeEventListener("signal", signalpalette);
    paletteManager.removeEventListener("increment", incpalette);
    paletteManager.removeEventListener("deincrement", deincpalette);

    palette.classList.add("disabled");
    title.blur();
    title.value = "";
    title.placeholder = titleText;

    if (paletteholder) {
        selected = paletteholder;
    }
}

/*
 * openPalette(mode)
 * mode ->
 *  - language
 *  - command
 *  - array of dictionaries
 *     ex: [
 *       { name: "option 1", callback: () => {} }
 *     ]
 */
export function openPalette(mode, select = selected) {
    paletteOpen = true;
    allowbindings = false;

    titleText = title.placeholder;

    if (select == selected) selected = null;
    palette.classList.remove("disabled");
    palette.style.width = title.style.width;
    title.value = "";

    var arr = mode;

    title.focus();

    if (typeof mode == "string") {
        if (mode == "language") {
            arr = paletteLangs;
            title.placeholder = "Select Language Mode";
        } else if (mode == "command") {
            arr = commands;
            title.placeholder = "Search by Command Name";
        }
    }

    title.focus();

    var btns = [];
    var selected = 0;

    const updselect = () => {
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove("select");
            if (i == selected) {
                btns[i].classList.add("select");
            }
        }
    };

    signalpalette = (_) => {
        if (btns[selected]) btns[selected].click();
    };

    incpalette = (_) => {
        selected = Math.min(selected + 1, btns.length - 1);
        updselect();
    };

    deincpalette = (_) => {
        selected = Math.max(selected - 1, 0);
        updselect();
    };

    paletteManager.addEventListener("signal", signalpalette);
    paletteManager.addEventListener("increment", incpalette);
    paletteManager.addEventListener("deincrement", deincpalette);

    const sort = (text) => {
        selected = 0;

        const hstart = `<p style="color: #00ffff; display: inline;"><b>`;
        const hend = `</b></p>`;

        const scores = fuzzysort.go(text, arr, { limit: 15, keys: ["name", "identifier"], all: true });

        const genbtn = (html, htmlDesc = undefined) => {
            const btn = document.createElement("button");
            btn.style =
                "width: 100%; height: 20px; margin-bottom: 5px; background-color: #00000022; border: none; outline: none; color: #fff; font-size: 1.2rem; text-align: left; border-radius: 7px;";
            btn.innerHTML = html;

            if (htmlDesc != undefined) {
                const dtxt = document.createElement("p");
                dtxt.style = "display: inline; font-size: 0.85rem; color: #777; padding-left: 5px;";
                dtxt.innerHTML = `(${htmlDesc})`;
                btn.appendChild(dtxt);
            }

            return btn;
        };

        paletteContainer.innerHTML = "";
        btns = [];
        for (var i = 0; i < scores.length; i++) {
            const h = fuzzysort.highlight(scores[i][0], hstart, hend);
            const btn = genbtn(
                h && h.trim() != "" ? h : scores[i].obj.name,
                fuzzysort.highlight(scores[i][1], hstart, hend)
            );

            btns.push(btn);

            paletteContainer.appendChild(btn);

            const identifier = scores[i].obj.identifier;

            btn.onclick = async function (_) {
                var sClose = false,
                    sReload = false;
                if (mode == "language") currentMode = identifier;
                else if (mode == "command")
                    for (const command of commands)
                        if (command.identifier === identifier)
                            if (command["onrun"] !== undefined) [sClose, sReload] = await command.onrun();
                if (!sClose) closePalette();
                if (!sReload) updateLang();
            };
        }

        updselect();
    };

    sort("");
    title.oninput = function () {
        sort(title.value);
    };
}

title.onclick = () => {
    openPalette("command");
};

export function getLanguage(ID) {
    for (const lang of languages) {
        if (lang.identifier == ID) return lang;
    }

    return null;
}

export async function updateLang() {
    mode.innerText = currentMode;
    if (lastMode != currentMode) {
        if (currentMode in syntaxCache) highlight = syntaxCache[currentMode];
        else {
            highlight = (await import(`./languages/${currentMode}.js`)).default;
            syntaxCache[currentMode] = highlight;
        }

        if (currentMode in serverCache) langserver = syntaxCache[currentMode];
        else {
            langserver = getLanguage(currentMode).server ? (await import(`./servers/${currentMode}.js`)).default : null;
            serverCache[currentMode] = langserver;
        }
    }
    lastMode = currentMode;
    update(selected);
}

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
        selected.c_char =
            fallback != null ? fallback : spl[selected.c_line] ? spl[selected.c_line].length : spl[spl.length].length;
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
        selected.c_char_end =
            fallback != null
                ? fallback
                : spl[selected.c_line_end]
                ? spl[selected.c_line_end].length
                : spl[spl.length - 1].length;
    }

    update(selected);
}

export function getcharwidth() {
    const exspan = document.createElement("span");
    exspan.style = `position: absolute; display: block; top: -100px; height: ${fontHeight}px; width: fit-content; font-size: ${
        fontHeight - 2
    }px;`;
    exspan.innerText = "W"; // W is one of the longest characters, although this should be monospaced.
    document.body.appendChild(exspan);
    const width = exspan.getBoundingClientRect().width;
    document.body.removeChild(exspan);

    return width;
}

var signalAutoComplete;
var incAutoComplete;
var deincAutoComplete;
export function hideintellisense($) {
    intellishow = false;

    intelliManager.removeEventListener("signal", signalAutoComplete);
    intelliManager.removeEventListener("increment", incAutoComplete);
    intelliManager.removeEventListener("deincrement", deincAutoComplete);
    $.intellisense.innerHTML = "";
}

export function intellisense($, lword) {
    var c = false;
    if (!$) c = true;
    if (langserver == null) c = true;
    if (lword.trim() == "") c = true;
    if (!isNaN(lword)) c = true;

    if (c) {
        hideintellisense($);
        return;
    }

    const [toffset, receive] = langserver("completion", lword);
    hideintellisense($);
    if (receive == undefined || receive.length <= 0) return;
    intellishow = true;

    var btns = [];
    var select = 0;

    signalAutoComplete = (_) => {
        btns[select].click();
    };

    incAutoComplete = (_) => {
        select = Math.min(btns.length - 1, select + 1);
        for (const btn of btns) btn.classList.remove("select");
        btns[select].classList.add("select");
    };

    deincAutoComplete = (_) => {
        select = Math.max(0, select - 1);
        for (const btn of btns) btn.classList.remove("select");
        btns[select].classList.add("select");
    };

    intelliManager.addEventListener("signal", signalAutoComplete);
    intelliManager.addEventListener("increment", incAutoComplete);
    intelliManager.addEventListener("deincrement", deincAutoComplete);

    for (const comp of receive) {
        const res = autocompletionResult(
            fuzzysort.highlight(comp.hinfo, '<b style="font-weight:bold;color:#00ffff;">', "</b>"),
            comp.location,
            comp.type
        );
        $.intellisense.appendChild(res);

        btns.push(res);

        res.onclick = () => {
            selected.history.push(
                selected.text,
                "completion",
                selected.c_line,
                selected.c_char,
                selected.c_line_end,
                selected.c_char_end
            );

            if (comp.type == "snippet") {
                const writes = comp.hinfo.obj.writes;

                var gotoLine = writes.length - 1;
                var gotoPos = writes[writes.length - 1].length;

                var x = 0;
                while (true) {
                    for (var i = 0; i < writes.length; i++) {
                        const reg = new RegExp(`\\{${x}\\}`);
                        const regrep = new RegExp(`\\{${x}\\}`, "g");
                        if (writes[i].search(reg) != -1) {
                            gotoLine = i;
                            gotoPos = writes[i].search(reg);
                            writes[i] = writes[i].replace(regrep, "");

                            if (x == -1) x = -3;

                            x++;
                            break;
                        } else {
                            if (x == -1) x = -2;
                            if (x != -2) x = -1;
                            break;
                        }
                    }

                    if (x == -2) break;
                }

                const lines = writes.join("\n");

                const toadd = selected.text.split("\n");
                var add = 0;
                for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
                selected.text =
                    selected.text.substring(0, add + selected.c_char - lword.length + toffset) +
                    lines +
                    selected.text.substring(add + selected.c_char);
                selected.c_line += gotoLine;
                selected.c_char = gotoPos;
            } else {
                const toadd = selected.text.split("\n");
                var add = 0;
                for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
                selected.text =
                    selected.text.substring(0, add + selected.c_char - lword.length + toffset) +
                    comp.text +
                    selected.text.substring(add + selected.c_char);
                selected.c_char += comp.text.length - lword.length + toffset;
            }

            update($);
            hideintellisense($);
        };
    }

    for (const btn of btns) btn.classList.remove("select");
    btns[select].classList.add("select");
}

export function grab(text, position) {
    var total = [];
    for (var i = position; i > 0; i--) {
        if (text.charAt(i - 1).trim() == "") break;
        total.push(text.charAt(i - 1));
    }

    return total.reverse().join("");
}

export function update($) {
    if (!$) return;

    const width = getcharwidth();

    const editor = $.editor;
    const hints = $.hints;

    const preview = $.showPreview && $.text.trim() == "";
    const txt = preview ? $.previewText : $.text;
    const lines = txt.split("\n");
    $.lines.innerHTML = "";
    for (var line = 1; line <= (preview ? 1 : lines.length); line++) {
        const d = document.createElement("div");
        d.classList.add("pheonix-line-number");
        d.style = `text-align: right; user-select: none; width: 100%; height: ${fontHeight}px; top: ${
            (line - 1) * fontHeight
        }px; font-size: ${fontHeight - 2}px; position: absolute;`;
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
        lined.style = `width: 100%; height: ${fontHeight}px; position: absolute; top: ${
            l * fontHeight
        }px; user-select: none;`;
        lined.setAttribute("pheonix-line-num", `${l}`);

        const lineContentsPre = preview
            ? { highlights: [{ type: "text", text: line }] }
            : highlight(line, lineContinues, l == 0 ? true : false);
        const lineContents = lineContentsPre.highlights;
        lineContinues = lineContentsPre.continue;

        var last = null;
        for (const lc of lineContents) {
            var span = document.createElement("span");
            // TODO: readd optimizer block
            // if (lc.text.trim() == "" && last) {
            //     last.innerText += lc.text;
            //     continue;
            //     // } else if (last && last.innerText.trim() == "") {
            //     //     span = last;
            //     //     span.className = "";
            // } else {
            //     span = document.createElement("span");
            // }

            span.style = `height: ${fontHeight}px; font-size: ${
                fontHeight - 2
            }px; width: fit-content; display: inline-block; user-select: none; color: ${
                preview ? "var(--hint-color);" : "var(--text-color);"
            }`;

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
        // INTELLISENSE POSITIONING
        //

        $.intellisense.style.left = `${100 + width * $.c_char}px`;
        $.intellisense.style.top = `${fontHeight * ($.c_line + 1)}px`;
        $.intellisense.style.maxHeight = `${fontHeight * 10}px`;

        //
        // LINE SELECTION AND LN NUM, COL NUM (X SELECTED) HANDLERS!
        //

        const lnp1 = getPositionFromLineAndChar($.text, $.c_line, $.c_char);
        const lnp2 = getPositionFromLineAndChar($.text, $.c_line_end, $.c_char_end);
        const diff = Math.max(lnp1, lnp2) - Math.min(lnp1, lnp2);
        linenum.innerText = `Ln ${$.c_line + 1}, Col ${$.c_char + 1} ${$.c_selecting ? `(${diff} selected)` : ""}`;

        if ($.c_selecting) {
            const lineDivs = [];
            var topLine = Math.max($.c_line, $.c_line_end);
            var bottomLine = Math.min($.c_line, $.c_line_end);
            var topChar = Math.max($.c_char, $.c_char_end);
            var bottomChar = Math.min($.c_line, $.c_line_end);

            for (var i = 0; i < topLine - bottomLine + 1; i++) {
                const div = document.createElement("div");
                div.classList.add("pheonix-selection-div");

                lineDivs.push(div);
            }

            $.presentation.innerHTML = "";
            for (var i = 0; i < lineDivs.length; i++) {
                const lineNum = bottomLine + i;
                const element = lineDivs[i];

                const minChar = bottomLine == $.c_line_end ? $.c_char_end : $.c_char;
                const maxChar = minChar == $.c_char_end ? $.c_char : $.c_char_end;

                var elementWidth;
                if (lineNum in $.text.split("\n")) {
                    elementWidth =
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

                //elementLeft = `left: 0px;`;
                //elementWidth = `${width}px`;

                element.style = `height: ${fontHeight}px; background-color: #ffffff33; top: ${
                    fontHeight * lineNum
                }px; position: absolute; ${elementLeft}width: ${elementWidth};`;

                $.presentation.appendChild(element);
            }
        } else $.presentation.innerHTML = "";

        // titling, etc

        const spl1 = selected.file.split("/").join("\\").split("\\");
        const filename = spl1[spl1.length - 1].trim() != "" ? spl1[spl1.length - 1].trim() : "Untitled";
        if (selected.presave != selected.text) {
            if (!paletteOpen) title.placeholder = "• " + filename + " - Loft ⮟";
            cbuffer.innerText = "• " + filename;
        } else {
            if (!paletteOpen) title.placeholder = filename + " - Loft ⮟";
            cbuffer.innerText = filename;
        }
    } else {
        $.cursor.classList.add("disabled-t");
    }
}

// f-acceleratorPushed(keyboard event)
//      > null (no return)
// when control is held and a key is pushed
// this function is called for checking
// if a keybind is triggerable.
async function acceleratorPushed(e) {
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
        selected.history.push(
            selected.text,
            "cut",
            selected.c_line,
            selected.c_char,
            selected.c_line_end,
            selected.c_char_end
        );
        if (selected.c_selecting) {
            const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
            const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
            await clipboard.writeText(selected.text.substring(Math.min(lnp1, lnp2), Math.max(lnp1, lnp2)));
            selected.text =
                selected.text.substring(0, Math.min(lnp1, lnp2)) + selected.text.substring(Math.max(lnp1, lnp2));
            selected.c_selecting = false;
        } else {
            await clipboard.writeText(selected.text.split("\n")[selected.c_line] + "\n");
            const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, 0);
            const lnp2 = getPositionFromLineAndChar(
                selected.text,
                selected.c_line,
                selected.text.split("\n")[selected.c_line].length + 1
            );
            selected.text = selected.text.substring(0, lnp1) + selected.text.substring(lnp2);
        }
        cap();
    } else if (e.key.toLowerCase() == "v") {
        const read = await clipboard.readText();
        if (read != null) {
            selected.history.push(
                selected.text,
                "paste",
                selected.c_line,
                selected.c_char,
                selected.c_line_end,
                selected.c_char_end
            );
            if (selected.c_selecting) {
                const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
                const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);

                selected.text =
                    selected.text.substring(0, Math.min(lnp1, lnp2)) +
                    read +
                    selected.text.substring(Math.max(lnp1, lnp2));
                selected.c_line = Math.min(selected.c_line, selected.c_line_end);
                selected.c_char = Math.min(selected.c_char, selected.c_char_end) + read.length;
            } else {
                const toadd = selected.text.split("\n");
                var add = 0;
                for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
                selected.text =
                    selected.text.substring(0, add + selected.c_char) +
                    read +
                    selected.text.substring(add + selected.c_char);
                selected.c_char += read.length;
            }
        }
        cap();
    } else if (e.key.toLowerCase() == "p") {
        e.preventDefault();
        openPalette("command");
    } else if (e.key.toLowerCase() == "l") {
        e.preventDefault();
        openPalette("language");
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
}

document.addEventListener("keydown", async function (e) {
    if (intellishow) {
        if (e.key == "Enter" || e.key == "Tab") { intelliManager.dispatchEvent(new Event("signal")); e.preventDefault(); return; } // prettier-ignore
        else if (e.key == "ArrowDown") { intelliManager.dispatchEvent(new Event("increment")); e.preventDefault(); return; } // prettier-ignore
        else if (e.key == "ArrowUp") { intelliManager.dispatchEvent(new Event("deincrement")); e.preventDefault(); return; } // prettier-ignore
    }

    if (paletteOpen) {
        if (e.key == "Escape") closePalette();
        else if (e.key == "Enter") paletteManager.dispatchEvent(new Event("signal"));
        else if (e.key == "ArrowDown") paletteManager.dispatchEvent(new Event("increment"));
        else if (e.key == "ArrowUp") paletteManager.dispatchEvent(new Event("deincrement"));
        return;
    }

    if (!allowbindings) return;

    if (e.getModifierState("Control") || e.getModifierState("Meta")) {
        // Acceleration keybinds
        // Allows for advanced keybinds

        e.preventDefault();
        acceleratorPushed(e);
        return;
    } else if (e.getModifierState("Shift")) {
        // Shift Acceleration
        // Allows for alternative keybinds using Shift+Key

        if (e.key == "ArrowLeft") {
            if (!selected.c_selecting) {
                selected.c_selecting = true;
                selected.c_char_end = selected.c_char;
                selected.c_line_end = selected.c_line;
            }

            selected.c_char_end--;
            cap(
                selected.text.split("\n")[selected.c_line_end - 1]
                    ? selected.text.split("\n")[selected.c_line_end - 1].length
                    : 0
            );
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
                selected.c_char_end = Math.min(
                    selected.text.split("\n")[selected.c_line_end].length,
                    selected.c_char_end
                );
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
                selected.c_char_end = Math.min(
                    selected.text.split("\n")[selected.c_line_end].length,
                    selected.c_char_end
                );
            } else {
                selected.c_char_end = 0;
            }
            update(selected);
            return;
        }
    }

    const offset = 0; //selected.c_line == selected.c_line_end ? 0 : 1;
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
        selected.history.push(
            selected.text,
            "write",
            selected.c_line,
            selected.c_char,
            selected.c_line_end,
            selected.c_char_end
        );
        if (!selected.c_selecting) {
            const toadd = selected.text.split("\n");
            var add = 0;
            for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
            selected.text =
                selected.text.substring(0, add + selected.c_char) +
                "\n" +
                selected.text.substring(add + selected.c_char);
            selected.c_char = 0;
            selected.c_line++;
        } else {
            const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
            const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
            selected.text =
                selected.text.substring(0, Math.min(lnp1, lnp2)) +
                "\n" +
                selected.text.substring(Math.max(lnp1, lnp2) + offset);
            selected.c_line = Math.min(selected.c_line, selected.c_line_end);
            selected.c_char = Math.min(selected.c_char, selected.c_char_end) + 1;
            cap();
        }

        selected.c_selecting = false;
    } else if (e.key == "Backspace") {
        selected.history.push(
            selected.text,
            "write",
            selected.c_line,
            selected.c_char,
            selected.c_line_end,
            selected.c_char_end
        );
        if (!selected.c_selecting) {
            const toadd = selected.text.split("\n");
            var add = 0;
            for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
            const oldlastline = toadd[selected.c_line - 1];
            selected.text =
                selected.text.substring(0, add + selected.c_char - 1) + selected.text.substring(add + selected.c_char);
            selected.c_char--;
            cap(oldlastline != null ? oldlastline.length : 0);
        } else {
            const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
            const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
            selected.text =
                selected.text.substring(0, Math.min(lnp1, lnp2)) + selected.text.substring(Math.max(lnp1, lnp2));
            selected.c_line = Math.min(selected.c_line, selected.c_line_end);
            selected.c_char = Math.min(selected.c_char, selected.c_char_end);
            cap();
        }
        selected.c_selecting = false;

        update(selected);
        var grb = grab(selected.text.split("\n")[selected.c_line], selected.c_char);
        intellisense(selected, grb);
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
    } else if (e.key == "Tab") {
        e.preventDefault();
        selected.history.push(
            selected.text,
            "write",
            selected.c_line,
            selected.c_char,
            selected.c_line_end,
            selected.c_char_end
        );
        if (!selected.c_selecting) {
            const toadd = selected.text.split("\n");
            var add = 0;
            for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
            selected.text =
                selected.text.substring(0, add + selected.c_char) +
                "    " +
                selected.text.substring(add + selected.c_char);
            selected.c_char += 4;
        } else {
            const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
            const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
            selected.text =
                selected.text.substring(0, Math.min(lnp1, lnp2)) +
                "    " +
                selected.text.substring(Math.max(lnp1, lnp2) + offset);
            selected.c_line = Math.min(selected.c_line, selected.c_line_end);
            selected.c_char = Math.min(selected.c_char, selected.c_char_end) + 4;
            cap();
        }

        selected.c_selecting = false;

        update(selected);
        var grb = grab(selected.text.split("\n")[selected.c_line], selected.c_char);
        intellisense(selected, grb);
    }
    // actual typing
    // checks modifiers too
    else if (e.key.substring(0, 1) == e.key) {
        selected.history.push(
            selected.text,
            "write",
            selected.c_line,
            selected.c_char,
            selected.c_line_end,
            selected.c_char_end
        );
        if (!selected.c_selecting) {
            const toadd = selected.text.split("\n");
            var add = 0;
            for (var i = 0; i < selected.c_line; i++) add += toadd[i].length + 1;
            selected.text =
                selected.text.substring(0, add + selected.c_char) +
                e.key +
                selected.text.substring(add + selected.c_char);
            selected.c_char++;
        } else {
            const lnp1 = getPositionFromLineAndChar(selected.text, selected.c_line, selected.c_char);
            const lnp2 = getPositionFromLineAndChar(selected.text, selected.c_line_end, selected.c_char_end);
            selected.text =
                selected.text.substring(0, Math.min(lnp1, lnp2)) +
                e.key +
                selected.text.substring(Math.max(lnp1, lnp2) + offset);
            selected.c_line = Math.min(selected.c_line, selected.c_line_end);
            selected.c_char = Math.min(selected.c_char, selected.c_char_end) + 1;
            cap();
        }

        selected.c_selecting = false;

        update(selected);
        var grb = grab(selected.text.split("\n")[selected.c_line], selected.c_char);
        intellisense(selected, grb);
    }

    update(selected);
});

function genFileObject(path, type, open = false) {
    const div = document.createElement("button");
    div.classList.add("file");
    div.name = path;
    div.type = type;

    // const tab = document.createElement("span");
    // tab.classList.add("file-tab");

    var iconimg = type == "file" ? "./resources/file-white.png" : "./resources/folder-white.png";

    var arrow = null;
    if (type == "dir") {
        arrow = document.createElement("img");
        arrow.classList.add("file-icon");
        arrow.src = `./resources/${open ? "arrow-down" : "arrow-right"}.png`;
    }

    const icon = document.createElement("img");
    icon.classList.add("file-icon");
    icon.src = iconimg;

    const txt = document.createElement("span");
    txt.classList.add("file-text");
    txt.innerText = path.split("/").pop();

    const marker = document.createElement("span");
    marker.classList.add("git-marker", "git-modified");
    marker.innerText = "M";

    if (arrow) div.appendChild(arrow);
    div.append(icon, txt, marker);

    return div;
}

async function indexFolder() {
    currentFiles.innerHTML = "";
    if (currentFiles.length > 0) document.getElementById("no-working-dir").classList.add("disabled");
    else {
        document.getElementById("no-working-dir").classList.remove("disabled");
        return;
    }

    // folders first
    const exclude = [".git"];
    for (const file of currentFiles) {
        if (file.children && !exclude.includes(file.name)) {
            const obj = genFileObject(file.name, "dir");
            fileContainer.appendChild(obj);
        }
    }

    // then files
    for (const file of currentFiles) {
        if (!file.children) {
            const obj = genFileObject(file.name, "file");
            fileContainer.appendChild(obj);
        }
    }
}

async function openFolder(path) {
    if (path == null) return;

    const entries = await fs.readDir(path, { recursive: false });
    currentFiles = entries;
    indexFolder();
}

export default function build(container, relative) {
    for (const lang of languages) {
        paletteLangs.push({
            name: lang.name,
            identifier: lang.identifier,
            callback: () => {
                currentMode = lang.identifier;
                updateLang();
            },
        });
    }

    const $ = generate(container, relative);
    selected = $;
    update($);

    document.addEventListener("mousedown", function (e) {
        closePalette();

        if (e.target === $.main || $.main.contains(e.target)) {
            selected = $;
            const rect = selected.editor.getBoundingClientRect();

            const cw = e.target.classList.contains("pheonix-cursor")
                ? selected.c_char
                : Math.round((e.clientX - rect.x) / getcharwidth());
            const hw =
                e.target.hasAttribute("pheonix-line-num") && !e.target.hasAttribute("pheonix-preview-hint")
                    ? e.target.getAttribute("pheonix-line-num")
                    : e.target.classList.contains("pheonix-cursor")
                    ? selected.c_line
                    : selected.text.split("\n").length - 1;
            selected.c_char = Math.min(cw, $.text.split("\n")[parseInt(hw)].length);
            selected.c_line = parseInt(hw);
            selected.c_char_end = selected.c_char;
            selected.c_line_end = selected.c_line;

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
        if (!selected || !selected.mousedown) return;
        const rect = selected.editor.getBoundingClientRect();

        const cw = Math.round((e.clientX - rect.x) / getcharwidth());
        const hw =
            e.target.hasAttribute("pheonix-line-num") && !e.target.hasAttribute("pheonix-preview-hint")
                ? e.target.getAttribute("pheonix-line-num")
                : selected.text.split("\n").length - 1;
        const ncw = Math.min(cw, $.text.split("\n")[hw].length);
        selected.c_char = ncw;
        selected.c_line = parseInt(hw);

        selected.c_selecting = false;
        if (selected.c_char_end != selected.c_char || selected.c_line_end != selected.c_line) {
            selected.c_selecting = true;
        }

        update(selected);
        cap();
    });

    $.addlistener("pheonix://updated", () => {
        update($);
    });

    mode.innerText = currentMode;

    mode.onclick = function () {
        openPalette("language", $);
    };

    return $;
}
