const { sort } = window.__LOFT__;

const operators = "-+[]{}~=#^*/%()?<>:;,.";
const completions = [
    "arguments",
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "eval",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "implements",
    "import",
    "in",
    "instanceof",
    "interface",
    "let",
    "new",
    "null",
    "package",
    "private",
    "protected",
    "public",
    "return",
    "static",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",

    // GLOBAL VARIABLES
    "window",
    "document",
    "screen",
    "undefined",
    "Infinity",
    "NaN",
    "console",

    // GLOBAL FUNCTIONS
    "alert",
    "atob",
    "btoa",
    "cancelAnimationFrame",
    "cancelIdleCallback",
    "captureEvents",
    "clearInterval",
    "clearTimeout",
    "print",
    "prompt",
    "releaseEvents",
    "requestAnimationFrame",
    "requestIdleCallback",
    "Array",
    "ArrayBuffer",
    "BigInt",
    "BigInt64Array",
    "BigUint64Array",
    "Boolean",
    "Error",
    "File",
    "Event",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "JSON",
    "Map",
    "Math",
    "Path2D",
    "Number",
    "Object",
    "Option",
    "Plugin",
    "PluginArray",
    "Profiler",
    "Promise",
    "Proxy",
    "Range",
    "RangeError",
    "RegExp",
    "RemotePlayback",
    "Request",
    "Response",
    "SVGElement",
    "Scheduler",
    "Scheduling",
    "Screen",
    "SharedWorker",
    "SourceBuffer",
    "StaticRange",
    "Storage",
    "String",
    "StyleSheet",
    "Symbol",
    "SyntaxError",
    "TaskSignal",
    "Text",
    "TextDecoder",
    "TextDecoderStream",
    "TextEncoder",
    "TextEncoderStream",
    "TimeRanges",
    "UIEvent",
    "URIError",
    "URL",
    "URLPattern",
    "URLSearchParams",
    "Uint8Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Uint32Array",
    "VideoFrame",
    "VideoPlaybackQuality",
    "Window",
    "Worker",
    "WritableStream",
    "WritableStreamDefaultController",
    "WritableStreamDefaultWriter",
    "XMLDocument",
    "XMLHttpRequest",
    "XMLHttpRequestEventTarget",
    "XMLHttpRequestUpload",
    "XMLSerializer",
    "XPathEvaluator",
    "XPathExpression",
    "XPathResult",
    "XSLTProcessor",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
];

const snippets = [
    {
        identifier: "for",
        writes: [
            // prettier-ignore
            "for (var i = 0; i < {0}; i++) {",
            "    {-1}",
            "}",
        ],
    },
    {
        identifier: "foro",
        writes: [
            // prettier-ignore
            "for (const {0} of {1}) {",
            "    {-1}",
            "}",
        ],
    },
    {
        identifier: "while",
        writes: [
            // prettier-ignore
            "while ({0}) {",
            "    {-1}",
            "}",
        ],
    },
    {
        identifier: "class",
        writes: [
            // prettier-ignore
            "class {0} {",
            "    constructor() {",
            "        {-1}",
            "    }",
            "}",
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
                    location: "@js/global",
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
