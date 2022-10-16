document.addEventListener("contextmenu", (event) => event.preventDefault());

// TAURI imports
const { appWindow } = window.__TAURI__.window;

// imports

import init from "./loftenv.js";
import build from "./pheonix/pheonix.js";

const title = document.getElementById("title");
const container = document.getElementById("container");
const close = document.getElementById("close");
const maximize = document.getElementById("maximize");
const minimize = document.getElementById("minimize");

title.innerText = "• Untitled - Loft ⮟";
title.style = `line-height: ${title.offsetHeight}px;`;

var maximized = true;

close.onclick = function () {
    appWindow.close();
};

maximize.onclick = function () {
    maximized = !maximized;
    if (!maximized) appWindow.maximize();
    else appWindow.unmaximize();
};

minimize.onclick = function () {
    appWindow.minimize();
};

appWindow.listen("tauri://resize", () => {
    title.style = `line-height: ${title.offsetHeight}px;`;
});

async function main() {
    await init();

    const editor = build(container, "./javascript/pheonix");
    editor.set(
        "Select a language (button in bottom right) to get started.\nStart typing to dismiss this message.",
        true
    );
}

main();
