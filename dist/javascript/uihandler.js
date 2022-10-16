const explorer = document.getElementById("explorer");
const explTabs = document.getElementById("expl-tab");
const editor = document.getElementById("container");
const bottom = document.getElementById("info-bar");
const container = document.getElementById("precontainer");

precontainer.style = "height: 980px; width: 100%; top: calc(var(--titlebar-height) + 3px); position: absolute;";
explorer.style = "left: 0px; width: 225px; height: calc(100% - 30px); top: 30px; position: absolute;";
explTabs.style = "width: 225px;";
editor.style = "left: 225px; width: calc(100% - 225px); height: 100%; top: 0px; position: absolute;";

let explorer_pos;
function resize_explorer(e) {
    const dx = explorer_pos - e.x;
    explorer_pos = e.x;
    explorer.style.width = parseInt(getComputedStyle(explorer, "").width) - dx + "px";
    explTabs.style.width = explorer.style.width;

    editor.style = `left: ${explorer.style.width}; width: calc(100% - ${explorer.style.width}); height: 100%; top: 0px; position: absolute;`;
}

explorer.addEventListener(
    "mousedown",
    (e) => {
        if (e.offsetX > explorer.offsetWidth - 8) {
            explorer_pos = e.x;
            document.addEventListener("mousemove", resize_explorer, false);
        }
    },
    false
);

document.addEventListener(
    "mouseup",
    () => {
        document.removeEventListener("mousemove", resize_explorer, false);
    },
    false
);
