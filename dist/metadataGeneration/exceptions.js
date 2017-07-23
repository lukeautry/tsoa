"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var GenerateMetadataError = (function (_super) {
    __extends(GenerateMetadataError, _super);
    function GenerateMetadataError(node, message) {
        var _this = _super.call(this) || this;
        _this.message = message + "\n in: " + getSourceFile(node);
        return _this;
    }
    return GenerateMetadataError;
}(Error));
exports.GenerateMetadataError = GenerateMetadataError;
function getSourceFile(node) {
    if (node.kind === ts.SyntaxKind.SourceFile) {
        return node.fileName;
    }
    else {
        if (node.parent) {
            return getSourceFile(node.parent);
        }
        else {
            return '';
        }
    }
}
//# sourceMappingURL=exceptions.js.map