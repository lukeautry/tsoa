import { Body, Get, Post, Queries, Query, Route } from '@tsoa/runtime';
import { z } from 'zod';

// Zod schemas for testing z.infer type resolution
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(0).max(120),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  metadata: z.object({ source: z.string() }).optional(),
});

const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
  inStock: z.boolean(),
  specifications: z
    .object({
      weight: z.number().optional(),
      dimensions: z
        .object({
          width: z.number(),
          height: z.number(),
          depth: z.number(),
        })
        .optional(),
    })
    .optional(),
});

const OrderSchema = z.object({
  id: z.string(),
  userId: z.number(),
  products: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    }),
  ),
  total: z.number().positive(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Complex generic types for testing
interface GenericWrapper<T> {
  data: T;
  metadata: {
    timestamp: Date;
    version: string;
  };
}

interface NestedGeneric<A, B> {
  first: A;
  second: B;
  combined: GenericWrapper<A & B>;
}

interface ConditionalType<T> {
  value: T extends string ? { text: T; length: number } : { numeric: T; doubled: number };
}

type MappedType<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K];
};

// Union types
type Status = 'active' | 'inactive' | 'pending';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  assignee?: string;
  dueDate?: Date;
}

// Pagination schema for @Queries testing
export const PaginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => parseInt(val || '1')),
  limit: z
    .string()
    .optional()
    .transform(val => parseInt(val || '10')),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PaginationQuery = z.infer<typeof PaginationSchema>;

// Discriminated union schemas for complex body testing
export const UserCreatedEventSchema = z.object({
  type: z.literal('user_created'),
  userId: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

export const UserUpdatedEventSchema = z.object({
  type: z.literal('user_updated'),
  userId: z.string(),
  changes: z.record(z.string(), z.any()),
  updatedAt: z.date(),
});

export const UserDeletedEventSchema = z.object({
  type: z.literal('user_deleted'),
  userId: z.string(),
  deletedAt: z.date(),
  reason: z.string().optional(),
});

export const UserEventSchema = z.discriminatedUnion('type', [UserCreatedEventSchema, UserUpdatedEventSchema, UserDeletedEventSchema]);

export type UserEvent = z.infer<typeof UserEventSchema>;

// Unlike UserEvent above, these are separately-declared interfaces, so they resolve to named
// refObject types rather than inline object literals.
export interface TextContentBlock {
  type: 'TEXT';
  text: string;
}

export interface ImageContentBlock {
  type: 'IMAGE';
  imageUrl: string;
}

export interface CarouselContentBlock {
  type: 'CAROUSEL';
  imageUrls: string[];
}

export type ContentBlock = TextContentBlock | ImageContentBlock | CarouselContentBlock;

// The generated schema leaves a tag with a default out of `required`, so it cannot discriminate.
export interface DefaultedTagFirst {
  /** @default "FIRST" */
  kind: 'FIRST';
  first?: string;
}

export interface DefaultedTagSecond {
  /** @default "SECOND" */
  kind: 'SECOND';
  second?: string;
}

export type DefaultedTagUnion = DefaultedTagFirst | DefaultedTagSecond;

export interface RequiredTagBlock {
  kind: 'required';
  requiredValue: string;
}

export interface OptionalTagBlock {
  kind?: 'optional';
  optionalValue: string;
}

export type OptionalTagUnion = RequiredTagBlock | OptionalTagBlock;

export interface OverlappingTagFirst {
  kind: 'shared';
  first: string;
}

export interface OverlappingTagSecond {
  kind: 'shared';
  second: string;
}

export type OverlappingTagUnion = OverlappingTagFirst | OverlappingTagSecond;

export type MixedMemberUnion = TextContentBlock | { type: 'INLINE'; inlineText: string };

export interface PrototypeTagBlock {
  kind: '__proto__';
  prototypeValue: string;
}

export interface ConstructorTagBlock {
  kind: 'constructor';
  constructorValue: string;
}

export interface PlainTagBlock {
  kind: 'plain';
  plainValue: string;
}

export type SpecialTagUnion = PrototypeTagBlock | ConstructorTagBlock | PlainTagBlock;

export interface InheritedTagParent {
  kind: 'inherited';
}

// The generated schema takes `kind` from the child, where `any` accepts every tag.
export interface UnconstrainedTagChild extends InheritedTagParent {
  kind: any;
}

export interface UnconstrainedTagOther {
  kind: 'other';
}

export type UnconstrainedTagUnion = UnconstrainedTagChild | UnconstrainedTagOther;

export interface ImplementedTagFirstContract {
  kind: 'implemented-first';
}

export interface ImplementedTagSecondContract {
  kind: 'implemented-second';
}

export class ImplementedTagFirst implements ImplementedTagFirstContract {
  public kind!: 'implemented-first';
}

export class ImplementedTagSecond implements ImplementedTagSecondContract {
  public kind!: 'implemented-second';
}

export type ImplementedTagUnion = ImplementedTagFirst | ImplementedTagSecond;

export interface RedeclaredTagBase {
  kind: 'redeclared';
}

export interface RedeclaredTagChild extends RedeclaredTagBase {
  kind: 'redeclared';
}

export interface RedeclaredTagSibling {
  kind: 'sibling';
}

export type RedeclaredTagUnion = RedeclaredTagChild | RedeclaredTagSibling;

// The generated schemas drop a property named `__proto__`, so it cannot discriminate.
export interface PrototypeNamedTagFirst {
  __proto__: 'first';
}

export interface PrototypeNamedTagSecond {
  __proto__: 'second';
}

export type PrototypeNamedTagUnion = PrototypeNamedTagFirst | PrototypeNamedTagSecond;

export interface SingleTagBlock {
  kind: 'single';
}

export interface AmbiguousTagFirst {
  kind: 'first';
  type: 'one';
}

export interface AmbiguousTagSecond {
  kind: 'second';
  type: 'two';
}

export type AmbiguousTagUnion = AmbiguousTagFirst | AmbiguousTagSecond;

export type AliasedTagFirst = { kind: 'first'; firstValue: string };

export type AliasedTagSecond = { kind: 'second'; secondValue: string };

export type AliasedTagUnion = AliasedTagFirst | AliasedTagSecond;

// Types that need the type checker to evaluate them
const appConfig = { mode: 'a', retries: 3 } as const;
export type AppConfig = typeof appConfig;

export enum ParamKind {
  A = 'a',
  B = 'b',
}
export interface ParamsByKind {
  [ParamKind.A]: { foo: string };
  [ParamKind.B]: { bar: number };
}

export type Shout = Uppercase<'abc' | 'def'>;
export type PrefixedId = `user_${string}`;

export type CheckedEvent = { type: 'a'; a: string } | { type: 'b'; b: number } | { type: 'c' };

const ROLES = { admin: 1, user: 2 } as const;
export type Role = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[Role];

/** @pattern ^[0-9a-f-]{36}$ */
export type UUID = string;
export interface WithUuid {
  id: UUID;
  label: string;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
}
export type OnlyRequire<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;
export type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: T[K] };

export interface TreeBase {
  items: TreeItem[];
}
export interface TreeItem extends TreeBase {
  name: string;
}

const SignupSchema = z.object({ email: z.string(), plan: z.string().default('free') });
export type SignupInput = z.input<typeof SignupSchema>;
export type SignupOutput = z.output<typeof SignupSchema>;

export type PatchOf<T> = {
  /** The patched value */
  patch?: T;
};
export interface HeritageBase {
  /** Declared by the base */
  base: string;
}
export interface Holder<T> {
  held: T;
}
export interface PatchFirst<T> extends PatchOf<T>, HeritageBase {
  own: number;
}
export interface PatchLast<T> extends HeritageBase, PatchOf<T> {
  own: number;
}
export interface MappedFirst<T> extends Partial<Holder<T>>, HeritageBase {
  own: number;
}
export interface MappedLast<T> extends HeritageBase, Partial<Holder<T>> {
  own: number;
}

export interface Labeled<T> {
  value: T;
}

export type TreeNodeBase = { children: TreeNodeBase[] };
export interface NamedTreeNode extends TreeNodeBase {
  name: string;
}
export type PlainBase = { plain: string };
export interface UsesPlainBase extends PlainBase {
  extra: number;
}

/** @pattern ^x */
export type Identifier = string;
export type Nullable<T> = T | null;
export interface NullableBox<T> {
  value: Nullable<T> | number;
}

export interface Pair<T = string, U = T> {
  first: T;
  second: U;
}

export const internalKey: unique symbol = Symbol('internal');
const constKey = 'fromConst';
export interface WithComputedKeys {
  [internalKey]: string;
  [constKey]: boolean;
  ['literal-key']: number;
  id: string;
}

@Route('ComplexType')
export class ComplexTypeController {
  /**
   * Test @Body with z.infer type (complex types should use @Body, not @Queries)
   */
  @Post('ZodUserBody')
  public async postZodUserBody(@Body() body: z.infer<typeof UserSchema>): Promise<z.infer<typeof UserSchema>> {
    return body;
  }

  /**
   * Test @Body with complex z.infer type
   */
  @Post('ZodProductBody')
  public async postZodProductBody(@Body() body: z.infer<typeof ProductSchema>): Promise<z.infer<typeof ProductSchema>> {
    return body;
  }

  /**
   * Test @Body with nested z.infer type
   */
  @Post('ZodOrderBody')
  public async postZodOrderBody(@Body() body: z.infer<typeof OrderSchema>): Promise<z.infer<typeof OrderSchema>> {
    return body;
  }

  /**
   * Test @Body with simple generic type using primitive types
   */
  @Post('SimpleGenericBody')
  public async postSimpleGenericBody(@Body() body: GenericWrapper<string>): Promise<GenericWrapper<string>> {
    return body;
  }

  /**
   * Test @Body with generic type using interface types
   */
  @Post('InterfaceGenericBody')
  public async postInterfaceGenericBody(@Body() body: GenericWrapper<Task>): Promise<GenericWrapper<Task>> {
    return body;
  }

  /**
   * Test @Body with simple interface type
   */
  @Post('SimpleInterfaceBody')
  public async postSimpleInterfaceBody(@Body() body: Task): Promise<Task> {
    return body;
  }

  /**
   * Test @Body with union types
   */
  @Post('UnionTypeBody')
  public async postUnionTypeBody(@Body() body: Task): Promise<Task> {
    return body;
  }

  /**
   * Test @Query with simple primitive types (appropriate for query parameters)
   */
  @Get('SimpleQuery')
  public async getSimpleQuery(@Query() id: string, @Query() name: string, @Query() age: number, @Query() isActive: boolean): Promise<{ id: string; name: string; age: number; isActive: boolean }> {
    return { id, name, age, isActive };
  }

  /**
   * Test @Query with union types (appropriate for query parameters)
   */
  @Get('UnionQuery')
  public async getUnionQuery(@Query() status: Status): Promise<{ status: Status }> {
    return { status };
  }

  /**
   * Test @Query with enum types (appropriate for query parameters)
   */
  @Get('EnumQuery')
  public async getEnumQuery(@Query() priority: Priority): Promise<{ priority: Priority }> {
    return { priority };
  }

  /**
   * Test @Queries with pagination schema (appropriate for query parameters)
   */
  @Get('PaginationQuery')
  public async getPaginationQuery(@Queries() query: PaginationQuery): Promise<{ pagination: PaginationQuery; data: any[] }> {
    return {
      pagination: query,
      data: [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ],
    };
  }

  /**
   * Test @Body with discriminated union type
   */
  @Post('DiscriminatedUnionBody')
  public async postDiscriminatedUnionBody(@Body() body: UserEvent): Promise<{ received: UserEvent; processed: boolean }> {
    return {
      received: body,
      processed: true,
    };
  }

  /**
   * Test @Body with a discriminated union of named interfaces
   */
  @Post('ContentBlockBody')
  public async postContentBlockBody(@Body() body: ContentBlock): Promise<ContentBlock> {
    return body;
  }

  /**
   * Test @Body with a nullable discriminated union
   */
  @Post('NullableContentBlockBody')
  public async postNullableContentBlockBody(
    @Body() body: TextContentBlock | ImageContentBlock | CarouselContentBlock | null,
  ): Promise<TextContentBlock | ImageContentBlock | CarouselContentBlock | null> {
    return body;
  }

  /**
   * Test @Body with a union whose shared tag has a default
   */
  @Post('DefaultedTagUnionBody')
  public async postDefaultedTagUnionBody(@Body() body: DefaultedTagUnion): Promise<DefaultedTagUnion> {
    return body;
  }

  /**
   * Test @Body with a union where the tag is optional on one member
   */
  @Post('OptionalTagUnionBody')
  public async postOptionalTagUnionBody(@Body() body: OptionalTagUnion): Promise<OptionalTagUnion> {
    return body;
  }

  /**
   * Test @Body with a union whose tag values overlap between members
   */
  @Post('OverlappingTagUnionBody')
  public async postOverlappingTagUnionBody(@Body() body: OverlappingTagUnion): Promise<OverlappingTagUnion> {
    return body;
  }

  /**
   * Test @Body with a union that has an inline object member
   */
  @Post('MixedMemberUnionBody')
  public async postMixedMemberUnionBody(@Body() body: MixedMemberUnion): Promise<MixedMemberUnion> {
    return body;
  }

  /**
   * Test @Body with a union whose tag values include '__proto__' and 'constructor'
   */
  @Post('SpecialTagUnionBody')
  public async postSpecialTagUnionBody(@Body() body: SpecialTagUnion): Promise<SpecialTagUnion> {
    return body;
  }

  /**
   * Test @Body with a union where one member overrides the inherited tag with `any`
   */
  @Post('UnconstrainedTagUnionBody')
  public async postUnconstrainedTagUnionBody(@Body() body: UnconstrainedTagUnion): Promise<UnconstrainedTagUnion> {
    return body;
  }

  /**
   * Test @Body with a union of classes that implement interfaces declaring the tag
   */
  @Post('ImplementedTagUnionBody')
  public async postImplementedTagUnionBody(@Body() body: ImplementedTagUnion): Promise<ImplementedTagUnion> {
    return body;
  }

  /**
   * Test @Body with a union where one member declares an inherited tag again
   */
  @Post('RedeclaredTagUnionBody')
  public async postRedeclaredTagUnionBody(@Body() body: RedeclaredTagUnion): Promise<RedeclaredTagUnion> {
    return body;
  }

  /**
   * Test @Body with a union whose tag property is named '__proto__'
   */
  @Post('PrototypeNamedTagUnionBody')
  public async postPrototypeNamedTagUnionBody(@Body() body: PrototypeNamedTagUnion): Promise<PrototypeNamedTagUnion> {
    return body;
  }

  /**
   * Test @Body with a single tagged type that can be null
   */
  @Post('NullableSingleTagBody')
  public async postNullableSingleTagBody(@Body() body: SingleTagBlock | null): Promise<SingleTagBlock | null> {
    return body;
  }

  /**
   * Test @Body with a union of members that share two qualifying tags
   */
  @Post('AmbiguousTagUnionBody')
  public async postAmbiguousTagUnionBody(@Body() body: AmbiguousTagUnion): Promise<AmbiguousTagUnion> {
    return body;
  }

  /**
   * Test @Body with a union of aliases of inline object types
   */
  @Post('AliasedTagUnionBody')
  public async postAliasedTagUnionBody(@Body() body: AliasedTagUnion): Promise<AliasedTagUnion> {
    return body;
  }

  /**
   * Test @Body with discriminated union type - user created event
   */
  @Post('UserCreatedEventBody')
  public async postUserCreatedEventBody(@Body() body: z.infer<typeof UserCreatedEventSchema>): Promise<{ event: z.infer<typeof UserCreatedEventSchema>; message: string }> {
    return {
      event: body,
      message: `User ${body.userId} created successfully`,
    };
  }

  /**
   * Test @Body with discriminated union type - user updated event
   */
  @Post('UserUpdatedEventBody')
  public async postUserUpdatedEventBody(@Body() body: z.infer<typeof UserUpdatedEventSchema>): Promise<{ event: z.infer<typeof UserUpdatedEventSchema>; message: string }> {
    return {
      event: body,
      message: `User ${body.userId} updated successfully`,
    };
  }

  /**
   * Test @Body with discriminated union type - user deleted event
   */
  @Post('UserDeletedEventBody')
  public async postUserDeletedEventBody(@Body() body: z.infer<typeof UserDeletedEventSchema>): Promise<{ event: z.infer<typeof UserDeletedEventSchema>; message: string }> {
    return {
      event: body,
      message: `User ${body.userId} deleted successfully`,
    };
  }

  @Get('Checked/TypeofConst')
  public async getTypeofConst(): Promise<AppConfig> {
    return null as any;
  }

  @Get('Checked/IndexedByEnum')
  public async getIndexedByEnum(): Promise<ParamsByKind[ParamKind.A]> {
    return null as any;
  }

  @Get('Checked/Intrinsic')
  public async getIntrinsic(): Promise<{ value: Shout }> {
    return null as any;
  }

  @Get('Checked/TemplateLiteral')
  public async getTemplateLiteral(): Promise<{ id: PrefixedId }> {
    return null as any;
  }

  @Get('Checked/Exclude')
  public async getExclude(): Promise<Exclude<CheckedEvent, { type: 'c' }>> {
    return null as any;
  }

  @Get('Checked/KeysAndValues')
  public async getKeysAndValues(): Promise<{ role: Role; value: RoleValue }> {
    return null as any;
  }

  @Get('Checked/Omit')
  public async getOmit(): Promise<Omit<WithUuid, 'label'>> {
    return null as any;
  }

  @Get('Checked/OnlyRequire')
  public async getOnlyRequire(): Promise<OnlyRequire<Profile, 'id'>> {
    return null as any;
  }

  @Get('Checked/Getters')
  public async getGetters(): Promise<Getters<Pick<Profile, 'id' | 'age'>>> {
    return null as any;
  }

  @Get('Checked/Tree')
  public async getTree(): Promise<TreeItem> {
    return null as any;
  }

  @Post('Checked/ZodInputOutput')
  public async postZodInputOutput(@Body() body: SignupInput): Promise<SignupOutput> {
    return null as any;
  }

  @Post('Checked/ZodInputInline')
  public async postZodInputInline(@Body() body: z.input<typeof SignupSchema>): Promise<void> {
    return;
  }

  @Get('Checked/GenericBases')
  public async getGenericBases(): Promise<{ patchFirst: PatchFirst<Profile>; patchLast: PatchLast<Profile>; mappedFirst: MappedFirst<Profile>; mappedLast: MappedLast<Profile> }> {
    return null as any;
  }

  @Get('Checked/GenericNames')
  public async getGenericNames(): Promise<{
    user: Labeled<`user_${string}`>;
    org: Labeled<`org_${string}`>;
    numbered: Labeled<`user_${number}`>;
  }> {
    return null as any;
  }

  @Post('Checked/RecursiveBase')
  public async postRecursiveBase(@Body() body: NamedTreeNode): Promise<UsesPlainBase> {
    return null as any;
  }

  @Post('Checked/AliasInGenericUnion')
  public async postAliasInGenericUnion(@Body() body: NullableBox<Identifier>): Promise<void> {
    return;
  }

  @Get('Checked/DefaultTypeArguments')
  public async getDefaultTypeArguments(): Promise<Pair> {
    return null as any;
  }

  @Get('Checked/ComputedKeys')
  public async getComputedKeys(): Promise<WithComputedKeys> {
    return null as any;
  }
}
