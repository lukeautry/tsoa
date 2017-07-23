"use strict";
/// <reference path="express.d.ts" />
/// <reference path="hapi.d.ts" />
/// <reference path="koa.d.ts" />
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./decorators/example"));
__export(require("./decorators/parameter"));
__export(require("./decorators/methods"));
__export(require("./decorators/tags"));
__export(require("./decorators/route"));
__export(require("./decorators/security"));
__export(require("./interfaces/controller"));
__export(require("./decorators/response"));
__export(require("./routeGeneration/templateHelpers"));
//# sourceMappingURL=index.js.map