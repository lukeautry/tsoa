import 'mocha';
import * as chai from 'chai';
import * as ts from 'typescript';
import {ResolveType} from '../../../src/metadataGeneration/resolveType';
import {MetadataGenerator} from '../../../src/metadataGeneration/metadataGenerator';

const expect = chai.expect;

function variableStatements(): ts.VariableStatement[] {
    const nodes: ts.VariableStatement[] = [];
    new MetadataGenerator('./tests/fixtures/types.ts').Generate();
    const program = ts.createProgram(['./tests/fixtures/types.ts'], {});
    program.getSourceFiles().forEach(sf => {
        if (sf.fileName !== 'tests/fixtures/types.ts') {
            return;
        }

        ts.forEachChild(sf, node => {
            if (node.kind === ts.SyntaxKind.VariableStatement) {
                nodes.push(node as ts.VariableStatement);
            }
        })
    });

    return nodes;
}

describe('ResolveType', () => {
    const statements = variableStatements();

    /**
     * Test that variable (key) is resolved to correct response (value).
     */
    const tests = {
        userResponse: 'User',
    };

    // guard
    it('test', () => {
        expect(statements.length).to.equal(Object.keys(tests).length);
    });

    statements.forEach(statement => {
        const declaration = statement.declarationList.declarations[0];
        const typeNode = declaration.type;
        const declarationName = declaration.name;
        if (typeNode === undefined) {
            throw new Error('typeNode cannot be undefined');
        }

        const variable = (declarationName as any).text;

        expect(ResolveType(typeNode).typeName).to.equal(tests[variable]);
    });
});
