# Pattern annotations

`@pattern` stores a JavaScript regular-expression source for schemas and runtime string validation. A single backtick pair wraps a source that contains spaces.

```ts
interface Model {
  /** @pattern `^[a-z ]+$` Only letters and spaces */
  value: string;
}

/** @pattern value `^a\x60 b$` Expected a backtick and space */
function validate(value: string) {}
```

The property pattern matches `a b`. The parameter pattern matches a backtick between `a` and a space, followed by `b`. The text after each wrapper supplies the custom error message.

A wrapper starts with exactly one backtick and stays on one line. The first backtick followed by an ASCII space or the end of the comment closes it. Write a literal backtick as `\x60`.

Otherwise, the first ASCII space separates the source from an optional message. Slashes remain part of the source. For example, `@pattern /api/v[0-9]+ Invalid path` stores `/api/v[0-9]+`. Regex literal syntax and flags have no special meaning. The source `/abc/i` matches the literal text `/abc/i`.

Metadata generation checks the source with `RegExp`, without flags, including when generating a specification without routes. An invalid source raises `GenerateMetadataError` with the annotation's location and a regex syntax hint. The stored source stays unchanged. Accepted syntax depends on the Node.js version that generates the metadata.
