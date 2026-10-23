# Choosing a type resolver

tsoa turns the TypeScript types in your controllers into the metadata that the OpenAPI spec, the routes and the validation are generated from. Two resolvers do this:

- **`legacy`** (the default). It walks your type annotations as syntax, and generic arguments are substituted by name.
- **`checker`**. It takes every type from the TypeScript type checker, the same way your editor does. Syntax is used only for names, JSDoc annotations (`@isInt`, `@pattern`, `@format`, `@default`, …) and decorators.

## Enabling the checker resolver

In `tsoa.json`:

```json
{
  "typeResolver": "checker"
}
```

You can also leave the configuration alone and set the `TSOA_TYPE_RESOLVER` environment variable to `checker` or `legacy`. Precedence works like this:

1. A `typeResolver` set in the configuration (or passed to `MetadataGenerator`) wins.
2. Otherwise `TSOA_TYPE_RESOLVER` applies.
3. Otherwise `legacy` is used.

## What changes

Component names (`Omit_User.id_`, `Partial_User_`, …) are generated exactly as with `legacy`, so generated clients and `$ref`s keep working. For types that `legacy` already handles correctly, the metadata is identical. The test suite checks this by generating every fixture with both resolvers (`yarn diff:resolvers` in `tests/`).

With `checker`, these resolve where `legacy` throws or produces a wrong schema:

- `typeof` a value: `typeof config`, `(typeof ROLES)[keyof typeof ROLES]`
- indexed access by an enum member or an imported value: `Params[Kind.A]`, `(typeof values)[keyof typeof other]`
- conditional types the legacy resolver evaluates wrongly or not at all, e.g. `Exclude<Union, { type: 'c' }>` and `NonNullable<number | null>`
- intrinsic string types: `Uppercase<'a' | 'b'>`, etc.
- template literal types with an open part: `` `user_${string}` `` becomes `string`
- utility types inside generic aliases, e.g. `type OnlyRequire<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>`. Legacy emits `{}` for these.
- JSDoc validators on aliased property types surviving `Omit`, `Pick` and `Partial` (`id: UUID` keeps the `UUID` model and its `@pattern`)
- inherited properties of models that reference each other (`interface Item extends Base { … }` where `Base` has `items: Item[]`)

Every intended difference between the two resolvers is listed, with a reason, in [`tests/differential/knownDifferences.ts`](../tests/differential/knownDifferences.ts).
