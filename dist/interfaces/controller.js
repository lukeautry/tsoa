"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Controller = (function () {
    function Controller() {
        this.statusCode = undefined;
    }
    Controller.prototype.getStatus = function () {
        return this.statusCode;
    };
    Controller.prototype.setStatus = function (statusCode) {
        this.statusCode = statusCode;
    };
    return Controller;
}());
exports.Controller = Controller;
//# sourceMappingURL=controller.js.map