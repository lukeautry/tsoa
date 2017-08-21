"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Inject http Body
 *  @param {string} [name] properties name in body object
 */
function Body() {
    return function () { return; };
}
exports.Body = Body;
/**
 * Inject value from body
 *
 * @param {string} [name] The name of the body parameter
 */
function BodyProp(name) {
    return function () { return; };
}
exports.BodyProp = BodyProp;
/**
 * Inject http request
 */
function Request() {
    return function () { return; };
}
exports.Request = Request;
/**
 * Inject value from Path
 *
 * @param {string} [name] The name of the path parameter
 */
function Path(name) {
    return function () { return; };
}
exports.Path = Path;
/**
 * Inject value from query string
 *
 * @param {string} [name] The name of the query parameter
 */
function Query(name) {
    return function () { return; };
}
exports.Query = Query;
/**
 * Inject value from Http header
 *
 * @param {string} [name] The name of the header parameter
 */
function Header(name) {
    return function () { return; };
}
exports.Header = Header;
//# sourceMappingURL=parameter.js.map