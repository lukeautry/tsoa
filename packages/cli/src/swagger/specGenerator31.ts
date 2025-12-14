import { Swagger, Tsoa } from '@tsoa/runtime';
import { merge as mergeAnything } from 'merge-anything';
import { merge as deepMerge } from 'ts-deepmerge';

import { ExtendedSpecConfig } from '../cli';
import { UnspecifiedObject } from '../utils/unspecifiedObject';
import { SpecGenerator3 } from './specGenerator3';

/**
 * OpenAPI 3.1 Spec Generator
 *
 * Extends SpecGenerator3 with OpenAPI 3.1 specific features:
 * - Tuple support via prefixItems
 * - OpenAPI version 3.1.0
 *
 * Uses inheritance to reuse all building logic from SpecGenerator3,
 * only overriding the version and adding tuple type support.
 */
export class SpecGenerator31 extends SpecGenerator3 {
  constructor(
    protected readonly metadata: Tsoa.Metadata,
    protected readonly config: ExtendedSpecConfig,
  ) {
    super(metadata, config);
  }

  // Override with OpenAPI 3.1 specific return type
  // The base class returns Swagger.Spec30, but this generator produces Swagger.Spec31
  public override GetSpec(): Swagger.Spec31 {
    let spec: Swagger.Spec31 = {
      openapi: '3.1.0',
      components: this.buildComponents() as Swagger.Components31,
      info: this.buildInfo(),
      paths: this.buildPaths() as { [name: string]: Swagger.Path31 },
      servers: this.buildServers(),
      tags: this.config.tags,
    };

    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      const mergeFuncs: { [key: string]: (spec: UnspecifiedObject, merge: UnspecifiedObject) => UnspecifiedObject } = {
        immediate: Object.assign,
        recursive: mergeAnything,
        deepmerge: (spec: UnspecifiedObject, merge: UnspecifiedObject): UnspecifiedObject => deepMerge(spec, merge),
      };

      spec = mergeFuncs[this.config.specMerging](spec as unknown as UnspecifiedObject, this.config.spec as UnspecifiedObject) as unknown as Swagger.Spec31;
    }

    return spec;
  }

  /**
   * Override to add tuple type support (OpenAPI 3.1 feature via prefixItems)
   */
  protected getSwaggerType(type: Tsoa.Type, title?: string): Swagger.BaseSchema {
    if (this.isTupleType(type)) {
      const prefixItems: Swagger.Schema31[] = type.types.map((t: Tsoa.Type) => this.getSwaggerType(t) as Swagger.Schema31);

      const schema: Swagger.Schema31 = {
        type: 'array',
        prefixItems,
        minItems: prefixItems.length,
        ...(type.restType
          ? {
              items: this.getSwaggerType(type.restType) as Swagger.Schema31,
            }
          : {
              maxItems: prefixItems.length,
              items: false,
            }),
      };

      return schema as unknown as Swagger.BaseSchema;
    }

    return super.getSwaggerType(type, title);
  }

  private isTupleType(type: Tsoa.Type): type is Tsoa.TupleType {
    return type.dataType === 'tuple';
  }
}
