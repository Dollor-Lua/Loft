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
        main.style = "width: 100%; height: 100%; position: relative; top: 0px; left: 0px; transform: translate3d(0px, 0px, 0px); contain: strict;";

        const lines = div();
        lines.classList.add("pheonix-margin");
        lines.style = "width: 64px; height: 100%; position: absolute; contain: strict; top: 0px; transform: translate3d(0px, 0px, 0px);";

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

        scroller.appendChild(hints);
        scroller.appendChild(presentation);
        scroller.appendChild(editor);

        main.appendChild(lines);
        main.appendChild(scroller);
        main.appendChild(cursor);

        container.appendChild(main);

        this.main = main;
        this.editor = editor;
        this.presentation = presentation;
        this.lines = lines;
        this.scroller = scroller;
        this.cursor = cursor;
        this.hints = hints;
    }
}

function generate(container, relative) {
    cssimport(`${relative}/css/default.css`, "pheonix-css-default");
    const main = new pheonixbox(container);
    return main;
}

export { generate };
