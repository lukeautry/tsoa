import type { HasModifiers } from 'typescript';
import { SyntaxKind, getModifiers } from 'typescript';

import { TypeResolver } from '../typeResolver';

/**
 * Transformer responsible to transforming native ts node into tsoa type.
 */
export abstract class Transformer {
  constructor(
    protected readonly resolver: TypeResolver,
  ) {}

  protected hasPublicModifier(node: HasModifiers): boolean {
    return (
      !node.modifiers ||
      node.modifiers.every(modifier => {
        return modifier.kind !== SyntaxKind.ProtectedKeyword && modifier.kind !== SyntaxKind.PrivateKeyword;
      })
    );
  }

  protected hasStaticModifier(node: HasModifiers): boolean | undefined {
    return (
      node.modifiers &&
      node.modifiers.some(modifier => {
        return modifier.kind === SyntaxKind.StaticKeyword;
      })
    );
  }

  protected isAccessibleParameter(node: HasModifiers): boolean {
    const modifiers = getModifiers(node);

    if (modifiers == null || modifiers.length === 0) {
      return false;
    }

    // public || public readonly
    if (modifiers.some(modifier => modifier.kind === SyntaxKind.PublicKeyword)) {
      return true;
    }

    // readonly, not private readonly, not public readonly
    const isReadonly = modifiers.some(modifier => modifier.kind === SyntaxKind.ReadonlyKeyword);
    const isProtectedOrPrivate = modifiers.some(modifier => {
      return modifier.kind === SyntaxKind.ProtectedKeyword || modifier.kind === SyntaxKind.PrivateKeyword;
    });
    return isReadonly && !isProtectedOrPrivate;
  }
}
