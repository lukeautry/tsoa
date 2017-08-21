"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var controllerGenerator_1 = require("./controllerGenerator");
var MetadataGenerator = (function () {
    function MetadataGenerator(entryFile, compilerOptions) {
        this.nodes = new Array();
        this.referenceTypeMap = {};
        this.circularDependencyResolvers = new Array();
        this.program = ts.createProgram([entryFile], compilerOptions || {});
        this.typeChecker = this.program.getTypeChecker();
        MetadataGenerator.current = this;
    }
    MetadataGenerator.prototype.IsExportedNode = function (node) { return true; };
    MetadataGenerator.prototype.Generate = function () {
        var _this = this;
        this.program.getSourceFiles().forEach(function (sf) {
            ts.forEachChild(sf, function (node) {
                _this.nodes.push(node);
            });
        });
        var controllers = this.buildControllers();
        this.circularDependencyResolvers.forEach(function (c) { return c(_this.referenceTypeMap); });
        return {
            controllers: controllers,
            referenceTypeMap: this.referenceTypeMap,
        };
    };
    MetadataGenerator.prototype.TypeChecker = function () {
        return this.typeChecker;
    };
    MetadataGenerator.prototype.AddReferenceType = function (referenceType) {
        if (!referenceType.refName) {
            return;
        }
        this.referenceTypeMap[referenceType.refName] = referenceType;
    };
    MetadataGenerator.prototype.GetReferenceType = function (refName) {
        return this.referenceTypeMap[refName];
    };
    MetadataGenerator.prototype.OnFinish = function (callback) {
        this.circularDependencyResolvers.push(callback);
    };
    MetadataGenerator.prototype.buildControllers = function () {
        var _this = this;
        return this.nodes
            .filter(function (node) { return node.kind === ts.SyntaxKind.ClassDeclaration && _this.IsExportedNode(node); })
            .map(function (classDeclaration) { return new controllerGenerator_1.ControllerGenerator(classDeclaration); })
            .filter(function (generator) { return generator.IsValid(); })
            .map(function (generator) { return generator.Generate(); });
    };
    return MetadataGenerator;
}());
exports.MetadataGenerator = MetadataGenerator;
//# sourceMappingURL=metadataGenerator.js.map