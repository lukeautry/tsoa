# Pattern annotations

`@pattern` stores a JavaScript regular-expression source for schema generation and runtime string validation. A single backtick pair wraps a source that contains literal spaces.

```ts
interface Model {
  /** @pattern `^[a-z ]+$` Only letters and spaces */
  value: string;
}

/** @pattern value `^[a-z ]+$` Only letters and spaces */
function validate(value: string) {}
```

Both examples store `^[a-z ]+$` and the custom error message `Only letters and spaces`. The source accepts `a b` and rejects a string with a tab between the letters.

Bare patterns use the first ASCII space to separate the source from an optional message. Slashes remain part of the source. For example, `@pattern /api/v[0-9]+ Invalid path` stores `/api/v[0-9]+`. JavaScript regex literal syntax and flags have no special meaning here. The source `/abc/i` matches the literal text `/abc/i`.

A wrapper starts with exactly one backtick. Its first unescaped closing backtick must precede an ASCII space or the end of the comment. The wrapper cannot cross a carriage return or line feed. A literal tab belongs to the source and does not separate the message. The parser removes exactly one ASCII space before a message and keeps the remaining spaces and backticks. TypeScript strips terminal JSDoc whitespace, and parameter annotations also trim the text after the parameter name.

An odd number of consecutive backslashes escapes a backtick. An even number allows it to close the wrapper. The source keeps all backslashes. For example, this pattern matches `a` followed by a backtick, a space, and `b`:

```ts
interface Model {
  /** @pattern `^a\` b$` Invalid value */
  value: string;
}
```

`\x60` also represents a literal backtick within the source. Use this spelling when the source also contains a space followed by `@`, as in `` `^a\x60b @c$` Invalid value ``. An inner backtick can cause TypeScript to end the JSDoc tag at the later `@`, even when a backslash escapes the backtick.

A backtick followed by ordinary source text does not close the wrapper.

An unclosed wrapper uses the existing first-space split. An annotation that starts with two or more backticks also keeps that split and removes at most one outer backtick pair from the first token. Two backticks produce an empty source, a lone backtick stays literal, and three backticks at each end leave two at each end. These forms do not wrap a source that contains spaces.

Metadata generation checks the extracted source with JavaScript's `RegExp` constructor, without flags. An invalid source raises `GenerateMetadataError` with the annotation's location and a regex syntax hint. This check also applies when generating a specification without routes. The stored source remains unchanged, and accepted regex syntax depends on the Node.js version that generates the metadata.
