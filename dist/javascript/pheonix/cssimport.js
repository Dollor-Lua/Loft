export default function importcss(file, id) {
    if (!document.getElementById(id)) {
        const head = document.getElementsByTagName("head")[0];
        const link = document.createElement("link");
        link.id = id;
        link.media = "all";
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = file;
        head.appendChild(link);
    }
}
