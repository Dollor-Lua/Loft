const { fs, invoke, shell, os } = window.__TAURI__;

const settings = {
    language: ".lua",
};

async function execute() {
    const loft = window.__LOFT__;
    const ext = loft.getext("loft.ext.lua");

    const file = loft.getFile();
    const folder = loft.getFolder(); // to search for entry point

    if (loft.getext("loft.ext.lua").luaExists) {
        await invoke("invoke", { path: ext.paths[0], pargs: [] });
    }

    const command = new shell.Command("lua");
}

async function main() {
    var [exists, data] = await window.__LOFT__.exists("lua");

    window.__LOFT__.ext("loft.ext.lua", {
        luaExists: exists,
        paths: data,
        default: null,
    });
}

// @loft.exec - run (F6 pressed)

const commands = {
    ["@loft.exec"]: execute,
};

export { main as default, commands, settings };
