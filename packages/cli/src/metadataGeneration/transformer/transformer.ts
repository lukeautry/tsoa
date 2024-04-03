import * as ts from 'typescript';

import { TypeResolver } from '../typeResolver';

/**
 * Transformer responsible to transforming native ts node into tsoa type.
 */
export abstract class Transformer {
  constructor(
    protected readonly resolver: TypeResolver,
  ) {}

  protected hasPublicModifier(node: ts.HasModifiers): boolean {
    return (
      !node.modifiers ||
      node.modifiers.every(modifier => {
        return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
      })
    );
  }

  protected hasStaticModifier(node: ts.HasModifiers): boolean | undefined {
    return (
      node.modifiers &&
      node.modifiers.some(modifier => {
        return modifier.kind === ts.SyntaxKind.StaticKeyword;
      })
    );
  }

  protected isAccessibleParameter(node: ts.HasModifiers): boolean {
    const modifiers = ts.getModifiers(node);

    if (modifiers == null || modifiers.length === 0) {
      return false;
    }

    // public || public readonly
    if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PublicKeyword)) {
      return true;
    }

    // readonly, not private readonly, not public readonly
    const isReadonly = modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword);
    const isProtectedOrPrivate = modifiers.some(modifier => {
      return modifier.kind === ts.SyntaxKind.ProtectedKeyword || modifier.kind === ts.SyntaxKind.PrivateKeyword;
    });
    return isReadonly && !isProtectedOrPrivate;
  }
}
