import * as ts from 'typescript';
import { getDecorators } from './../utils/decoratorUtils';
import { getCustomAttributes } from './customAttribute';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { getSecurities } from './security';
import { Tsoa } from './tsoa';
import { TypeResolver } from './typeResolver'

export class ControllerGenerator {
  private readonly path?: string;
  private readonly tags?: string[];
  private readonly security?: Tsoa.Security[];
  private readonly customMethodAttributes: Tsoa.CustomAttribute[];

  constructor(
    private readonly node: ts.ClassDeclaration,
    private readonly current: MetadataGenerator,
    ) {
    this.path = this.getPath();
    this.tags = this.getTags();
    this.security = this.getSecurity();
    this.customMethodAttributes = this.getCustomMethodAttributes();
  }

  public IsValid() {
    return !!this.path || this.path === '';
  }

  public Generate(): Tsoa.Controller {
    if (!this.node.parent) {
      throw new GenerateMetadataError('Controller node doesn\'t have a valid parent source file.');
    }
    if (!this.node.name) {
      throw new GenerateMetadataError('Controller node doesn\'t have a valid name.');
    }

    const sourceFile = this.node.parent.getSourceFile();

    return {
      location: sourceFile.fileName,
      methods: this.buildMethods(),
      name: this.node.name.text,
      path: this.path || '',
    };
  }

  private buildMethods() {
    const typeNode = this.current.typeChecker.getTypeAtLocation(this.node);
    const genericTypeMap = this.getResolvedGenericTypeMap(typeNode);

    // using ts.Type::getProperties() ensures all inherited methods are included
    const methods = typeNode.getProperties()
      .filter((m) => m.valueDeclaration.kind === ts.SyntaxKind.MethodDeclaration)
      .map(m => new MethodGenerator(m.valueDeclaration as ts.MethodDeclaration, this.current, this.tags, this.security, genericTypeMap))
      .filter((generator) => generator.IsValid())
      .map((generator) => generator.Generate());

    methods.forEach((method) => {
      method.customAttributes.push(...this.customMethodAttributes);
      method.customAttributes = this.resolveCustomAttributes(method.customAttributes, method.path, method.method);
    });

    return methods;
  }

  private getPath() {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'Route');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Route decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const decoratorArgument = expression.arguments[0] as ts.StringLiteral;
    return decoratorArgument ? `${decoratorArgument.text}` : '';
  }

  private getTags() {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'Tags');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Tags decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return expression.arguments.map((a: any) => a.text as string);
  }

  private getSecurity(): Tsoa.Security[] {
    const securityDecorators = getDecorators(this.node, (identifier) => identifier.text === 'Security');
    if (!securityDecorators || !securityDecorators.length) {
      return [];
    }

    return getSecurities(securityDecorators);
  }

  private getCustomMethodAttributes() {
    const customAttributeDecorators = getDecorators(this.node, (identifier) => identifier.text === 'CustomMethodAttribute');
    if (!customAttributeDecorators || !customAttributeDecorators.length) {
      return [];
    }

    return getCustomAttributes(customAttributeDecorators);
  }

  // given a type, traverses any base classes (recursively) and creates a map of any
  // generic type parameters so that the TypeResolver can find them
  private getResolvedGenericTypeMap(typeNode: ts.Type) {
    // using a map of maps, where the top level keys represent the names of the base
    // classes and whose values are maps in the form of `typeT->resolvedModel`.
    // this will allow the TypeResolver to correctly find, for example, that a generic
    // type parameter `T` defined on a nested base class method resolves to some model `Foo`,
    // because at the top of the inheritance chain the concrete class used `Foo` as `T`
<<<<<<< HEAD
    const genericTypeMap: Tsoa.GenericTypeMap = new Map<string, Map<string, string | ts.EntityName>>();

=======
    const genericTypeMap: Tsoa.GenericTypeMap = new Map<string, Map<string, string | Tsoa.UsableDeclaration>>();
    
>>>>>>> origin
    const baseTypes = typeNode.getBaseTypes();

    if (baseTypes && baseTypes.length) {
      baseTypes.forEach((baseType: ts.TypeReference) => {
        const target = baseType.target;

        if (baseType.typeArguments && baseType.typeArguments.length) {
          const baseTypeName = target.symbol.name;

          // ensure a top level map entry for this base type
          if (!genericTypeMap.has(baseTypeName)) {
            genericTypeMap.set(baseTypeName, new Map<string, string | Tsoa.UsableDeclaration>());
          }

          const baseTypeMap = genericTypeMap.get(baseTypeName);

          if (baseTypeMap) {
            // correlate by index
            baseType.typeArguments.forEach((baseArg: ts.TypeReference, index) => {
              if (target.typeParameters) {
                const targetParam = target.typeParameters[index] as ts.TypeReference;
                const targetParamName = targetParam.symbol ? targetParam.symbol.name : ts.TypeFlags[targetParam.flags];
<<<<<<< HEAD
                let baseArgName: string | ts.EntityName = baseArg.symbol ? baseArg.symbol.name : ts.TypeFlags[baseArg.flags];

                // use the source file locals to attempt pushing a ts.EntityName into the map, which
                // will allow the type resolver to properly resolve the model even in inherited controllers
                // (casting to any because for some reason the ts type does not include the `locals` map,
                // which definitely exists at run time)
                const sourceFile = this.node.parent.getSourceFile() as any;
                if (sourceFile.locals) {
                  const locals = sourceFile.locals as Map<string, ts.Symbol>;
                  const local = locals.get(baseArgName);

                  if (local && local.declarations.length) {
                    baseArgName = (local.declarations[0] as ts.NamedDeclaration).name as ts.Identifier || baseArgName;
                  }
                }

                baseTypeMap.set(targetParamName, baseArgName);
=======
                let baseArgDeclaration: string | Tsoa.UsableDeclaration;
                
                if (
                  baseArg.symbol &&
                  baseArg.symbol.declarations.length &&
                  TypeResolver.nodeIsUsable(baseArg.symbol.declarations[0])
                ) {
                  baseArgDeclaration = baseArg.symbol.declarations[0] as Tsoa.UsableDeclaration;
                } else {
                  baseArgDeclaration = ts.TypeFlags[baseArg.flags];
                }
                
                baseTypeMap.set(targetParamName, baseArgDeclaration);
>>>>>>> origin
              }
            });

            // recurse down the inheritance chain and then make one flattened map
            const baseGenericMap = this.getResolvedGenericTypeMap(target);
            baseGenericMap.forEach((value, key) => {
              if (!genericTypeMap.has(key)) {
                genericTypeMap.set(key, new Map<string, string | Tsoa.UsableDeclaration>());
              }

              const nestedBaseTypeMap = genericTypeMap.get(key);

              if (nestedBaseTypeMap) {
                value.forEach((resolvedTypeName, genericTypeName) => {
                  // if type params (keys in the map) in the nested base types match a key
                  // one level up, it ultimately means they should resolve to the same type
                  const baseResolvedTypeName = baseTypeMap.get(genericTypeName) || resolvedTypeName;
                  nestedBaseTypeMap.set(genericTypeName, baseResolvedTypeName);
                });
              }
            });
          }
        }
      });
    }

    return genericTypeMap;
  }

  private resolveCustomAttributes(customAttributes: Tsoa.CustomAttribute[], path: string, method: string) {
    return customAttributes.map((customAttr) => {
      let attributeValue = JSON.stringify(customAttr.value);

      attributeValue = attributeValue.replace(/\{\$PATH\}/g, path);
      attributeValue = attributeValue.replace(/\{\$METHOD\}/g, method.toUpperCase());

      return { key: customAttr.key, value: JSON.parse(attributeValue) };
    });
  }
}
