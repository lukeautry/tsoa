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
}
