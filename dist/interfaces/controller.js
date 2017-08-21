"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Controller = (function () {
    function Controller() {
        this.statusCode = undefined;
        this.headers = {};
    }
    Controller.prototype.setStatus = function (statusCode) {
        this.statusCode = statusCode;
    };
    Controller.prototype.getStatus = function () {
        return this.statusCode;
    };
    Controller.prototype.setHeader = function (name, value) {
        this.headers[name] = value;
    };
    Controller.prototype.getHeader = function (name) {
        return this.headers[name];
    };
    Controller.prototype.getHeaders = function () {
        return this.headers;
    };
    return Controller;
}());
exports.Controller = Controller;
//# sourceMappingURL=controller.js.map