const { sort } = window.__LOFT__;

const operators = "-+[]{}~=#^*/%()<>:;,.";
const completions = [
    "and",
    "break",
    "do",
    "else",
    "elseif",
    "end",
    "false",
    "for",
    "function",
    "if",
    "in",
    "local",
    "nil",
    "not",
    "or",
    "repeat",
    "return",
    "then",
    "true",
    "until",
    "while",

    // GLOBAL VARIABLES
    "string",
    "table",
    "_G",
    "_VERSION",

    // GLOBAL FUNCTIONS
    "dofile",
    "dostring",
    "nextvar",
    "require",
    "assert",
    "collectgarbage",
    "error",
    "getfenv",
    "getmetatable",
    "ipairs",
    "loadstring",
    "newproxy",
    "next",
    "pairs",
    "pcall",
    "print",
    "rawequal",
    "rawget",
    "rawset",
    "select",
    "setfenv",
    "setmetatable",
    "tonumber",
    "tostring",
    "type",
    "unpack",
    "xpcall",
];

const snippets = [
    {
        identifier: "for",
        writes: [
            // prettier-ignore
            "for i=1, 10, 1 do",
            "    ",
            "end",
        ],
    },
    {
        identifier: "fori",
        writes: [
            // prettier-ignore
            "for i, v in ipairs() do",
            "    ",
            "end",
        ],
    },
    {
        identifier: "forp",
        writes: [
            // prettier-ignore
            "for i, v in pairs() do",
            "    ",
            "end",
        ],
    },
];

function main(mode, ...rest) {
    if (mode == "completion") {
        const text = rest[0];
        if (operators.includes(text.charAt(text.length - 1))) return [];

        var newOffset = 0;

        var ntext = "";
        for (var i = text.length - 1; i >= 0; i--) {
            if (operators.includes(text.charAt(i))) {
                newOffset = i + 1;
                break;
            }

            ntext = text.charAt(i) + ntext;
        }

        const topcompletions = sort.go(ntext, completions);
        const topsnippets = sort.go(ntext, snippets, { key: "identifier" });
        var gen = [];

        var combined = topcompletions;
        for (const res of topsnippets) {
            res["SNIPPET"] = true;
            combined.push(res);
        }

        combined.sort((a, b) => Math.abs(a.score) - Math.abs(b.score));

        for (const res of combined) {
            if (!("SNIPPET" in res)) {
                gen.push({
                    type: "completion",
                    text: res.target,
                    location: "@lua/global",
                    hinfo: res,
                });
            } else {
                var cut = res.obj.writes[0].length > 20;
                gen.push({
                    type: "snippet",
                    text: res.target,
                    location: res.obj.writes[0].substring(0, cut ? 15 : res.obj.writes[0].length) + " ...",
                    hinfo: res,
                });
            }
        }

        return [newOffset, gen];
    }
}

export default main;
