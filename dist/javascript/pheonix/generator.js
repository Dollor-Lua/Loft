import cssimport from "./cssimport.js";
import historyManager from "./history.js";

function div() {
    return document.createElement("div");
}

class pheonixbox {
    listeners = {};

    main = null;
    editor = null;
    lines = null;
    scroller = null;
    cursor = null;
    hints = null;
    presentation = null;
    palette = null;
    paletteSearch = null;
    paletteContainer = null;
    intellisense = null;

    c_char = 0;
    c_char_end = 0;
    c_line = 0;
    c_line_end = 0;
    c_selecting = false;
    text = "";

    showPreview = false;
    previewText = "";

    file = "";

    presave = "";

    mousedown = false;

    history = null;

    fire = (channel, message) => {
        if (this.listeners[channel] != null) {
            for (var i = 0; i < this.listeners[channel].length; i++) {
                this.listeners[channel][i](message);
            }
        }
    };

    set = (text, preview = false) => {
        this.previewText = preview ? text : this.previewText;
        this.text = preview ? this.text : text;
        this.showPreview = preview;
        this.fire("pheonix://updated", [this.text, this.previewText, this.showPreview]);
    };

    addlistener = (channel, listener) => {
        if (this.listeners[channel] == null) {
            this.listeners[channel] = [];
        }
        this.listeners[channel].push(listener);
    };

    constructor(container) {
        this.listeners["pheonix://updated"] = [];

        this.history = new historyManager();

        const main = div();
        main.classList.add("pheonix-container");
        main.style =
            "width: 100%; height: 100%; position: relative; top: 0px; left: 0px; transform: translate3d(0px, 0px, 0px); contain: strict;";

        const palette = div();
        palette.classList.add("pheonix-palette");
        palette.classList.add("disabled");
        palette.style =
            "width: 75%; max-width: 800px; position: absolute; top: 50px; left: 50%; transform: translateX(-50%); min-height: 40px; height: fit-content;";

        const paletteText = document.createElement("input");
        paletteText.type = "text";
        paletteText.placeholder = "Search by Command Name";
        paletteText.classList.add("pheonix-palette-text");
        paletteText.style =
            "width: calc(100% - 10px); height: 30px; top: 5px; left: 5px; position: relative; background-color: #00000046; display: block; box-sizing: border-box; border: none; color: #fff; padding-left: 10px; font-size: 1.3rem; margin-bottom: 10px; outline: none;";

        const paletteOptions = div();
        paletteOptions.classList.add("pheonix-palette-options");
        paletteOptions.style =
            "width: calc(100% - 10px); height: fit-content; left: 5px; position: relative; top: 5px; margin-top: 5px;";

        const lines = div();
        lines.classList.add("pheonix-margin");
        lines.style =
            "width: 64px; height: 100%; position: absolute; contain: strict; top: 0px; transform: translate3d(0px, 0px, 0px);";

        const cursor = div();
        cursor.classList.add("pheonix-cursor");
        cursor.classList.add("disabled-t");
        cursor.style = "width: 2px; height: 16px; position: absolute; left: 0px; top: 0px;";

        const scroller = div();
        scroller.classList.add("pheonix-scrollable");
        scroller.style =
            "width: 100%; height: 100%; position: absolute; top: 0px; left: 75px; transform: translate3d(0px, 0px, 0px); contain: strict;";

        const presentation = div();
        presentation.classList.add("pheonix-presentation");
        presentation.style =
            "position: absolute; overflow: hidden; width: 1e+06px; height: 1e+06px; transform: translate3d(0px, 0px, 0px); contain: strict; top: 0px; left: 0px;";

        const hints = div();
        hints.classList.add("pheonix-lines");
        hints.style =
            "position: absolute; overflow: hidden; width: 1e+06px; height: 1e+06px; transform: translate3d(0px, 0px, 0px); contain: strict; top: 0px; left: 0px;";

        const editor = div();
        editor.classList.add("pheonix-lines");
        editor.style =
            "position: absolute; overflow: hidden; width: 1e+06px; height: 1e+06px; transform: translate3d(0px, 0px, 0px); contain: strict; top: 0px; left: 0px;";

        const intellisense = div();
        intellisense.classList.add("pheonix-intellisense");
        intellisense.style =
            "width: 350px; height: fit-content; max-height: 200px; position: absolute; left: 0px; top: 0px; overflow-y: auto; background-color: #000; border-radius: 5px; background-color: var(--autocomplete-background); box-shadow: inset 0 0 0 2px var(--autocomplete-border)"; // border: 2px solid var(--autocomplete-border);

        palette.appendChild(paletteText);
        palette.appendChild(paletteOptions);

        scroller.appendChild(hints);
        scroller.appendChild(presentation);
        scroller.appendChild(editor);

        main.appendChild(lines);
        main.appendChild(scroller);
        main.appendChild(cursor);
        main.appendChild(palette);
        main.appendChild(intellisense);

        container.appendChild(main);

        this.main = main;
        this.editor = editor;
        this.presentation = presentation;
        this.lines = lines;
        this.scroller = scroller;
        this.cursor = cursor;
        this.hints = hints;
        this.palette = palette;
        this.paletteSearch = paletteText;
        this.paletteContainer = paletteOptions;
        this.intellisense = intellisense;

        palette.addEventListener("mousedown", function (e) {
            e.stopPropagation();
        });
    }
}

function generate(container, relative) {
    cssimport(`${relative}/css/default.css`, "pheonix-css-default");
    const main = new pheonixbox(container);
    return main;
}

export { generate };

export function autocompletionResult(text, location, type) {
    // TODO: add support for types

    const b = document.createElement("button");
    b.classList.add("pheonix-intellisense-button");
    b.style =
        "min-width: fit-content; width: 100%; height: fit-content; position: relative; font-size: 1.5rem; display: flex; flex-direction: row; flex-wrap: nowrap; outline: none; background-color: #0000; border: none;";

    const img = document.createElement("img");
    img.src = type == "snippet" ? "../resources/snippet.png" : "../resources/insertion.png";

    const left = document.createElement("p");
    left.innerHTML = text;
    left.style =
        "display: inline; justify-content: flex-start; height: 100%; margin-top: 0; margin-bottom: 0; text-align: center; padding-left: 5px; padding-top: 5px; padding-bottom: 5px; color: #fff;";

    const right = document.createElement("p");
    right.innerHTML = location;
    right.style =
        "display: inline; justify-content: flex-end; height: 100%; margin-top: 0; margin-bottom: 0; margin-left: auto; text-align: center; padding-right: 5px; padding-top: 5px; padding-bottom: 5px; color: #ffffff77;";

    b.appendChild(img);
    b.appendChild(left);
    b.appendChild(right);

    return b;
}
