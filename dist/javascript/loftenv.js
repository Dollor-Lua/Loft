const { invoke, os, shell } = window.__TAURI__;
import fuzzysort from "./pheonix/external/fuzzysort.js";

async function init() {
    var LOFT_OS = {
        platform: await os.platform(),
        arch: await os.arch(),
        version: await os.version(),
        kernel: await os.version(),
    };

    var LOFT = {
        os: LOFT_OS,
        sort: fuzzysort,

        exists: async function (path) {
            var does = false;
            var data = [];

            does = await invoke("exists", { path: path });
            if (!does) {
                if (LOFT_OS.platform == "win32") {
                    const command = new shell.Command("where", path);

                    command.on("close", (data) => {
                        does = data.code == 0;
                    });

                    command.stdout.on("data", (line) => {
                        data.push(line);
                    });

                    await command.execute();
                } else if (LOFT_OS.platform == "linux") {
                    const command = new shell.Command("apt", ["list", "--installed"]);
                    var container = [];

                    command.on("close", (_) => {
                        for (const progv of container) {
                            const program = progv.split("/")[0];
                            if (program.startsWith(path)) {
                                data.push(program);
                            }
                        }
                    });

                    command.stdout.on("data", (line) => {
                        container.push(line);
                    });

                    await command.execute();
                } else if (LOFT_OS.platform == "darwin") {
                    return [false, ["MacOS is not supported, although you can help add it by contributing to Loft!"]];
                } else {
                    return [false, ["Platform is unsupported."]];
                }

                return [does, data];
            }
        },

        ext: (extid, data) => {
            window.__LOFT__[extid] = data;
        },

        getext: (extid) => {
            return window.__LOFT__[extid];
        },
    };

    window.__LOFT__ = LOFT;
}

export default init;
