export default [
    { name: "PlainText", identifier: "plaintext", extensions: [".txt"], extension: false, server: false },
    { name: "Lua", identifier: "lua", extensions: [".lua"], extension: false, server: true },
    {
        name: "JavaScript",
        identifier: "js",
        extensions: [".js", ".es6", ".mjs", ".cjs", ".pac"],
        extension: false,
        server: true,
    },
    { name: "C++", identifier: "cpp", extensions: [".cc", ".cpp", ".h", ".hpp"], extension: false, server: false },
    { name: "C", identifier: "c", extensions: [".c"], extension: false, server: false },
];
