"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getJSDocDescription(node) {
    var jsDocs = node.jsDoc;
    if (!jsDocs || !jsDocs.length) {
        return undefined;
    }
    return jsDocs[0].comment || undefined;
}
exports.getJSDocDescription = getJSDocDescription;
function getJSDocComment(node, tagName) {
    var tags = getJSDocTags(node, function (tag) { return tag.tagName.text === tagName; });
    if (tags.length === 0) {
        return;
    }
    return tags[0].comment;
}
exports.getJSDocComment = getJSDocComment;
function getJSDocTagNames(node) {
    var tags;
    if (node.kind === ts.SyntaxKind.Parameter) {
        var parameterName_1 = node.name.text;
        tags = getJSDocTags(node.parent, function (tag) {
            return tag.comment !== undefined && tag.comment.startsWith(parameterName_1);
        });
    }
    else {
        tags = getJSDocTags(node, function (tag) {
            return tag.comment !== undefined;
        });
    }
    return tags.map(function (tag) {
        return tag.tagName.text;
    });
}
exports.getJSDocTagNames = getJSDocTagNames;
function getJSDocTags(node, isMatching) {
    var jsDocs = node.jsDoc;
    if (!jsDocs || jsDocs.length === 0) {
        return [];
    }
    var jsDoc = jsDocs[0];
    if (!jsDoc.tags) {
        return [];
    }
    return jsDoc.tags.filter(isMatching);
}
exports.getJSDocTags = getJSDocTags;
function isExistJSDocTag(node, isMatching) {
    var tags = getJSDocTags(node, isMatching);
    if (tags.length === 0) {
        return false;
    }
    return true;
}
exports.isExistJSDocTag = isExistJSDocTag;
//# sourceMappingURL=jsDocUtils.js.map