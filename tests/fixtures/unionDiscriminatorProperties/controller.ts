import { Body, Post, Route } from '@tsoa/runtime';

export interface ConstructorTagFirst {
  constructor: 'first';
}

export interface ConstructorTagSecond {
  constructor: 'second';
}

export interface ToStringTagFirst {
  toString: 'first';
}

export interface ToStringTagSecond {
  toString: 'second';
}

export type ConstructorUnion = ConstructorTagFirst | ConstructorTagSecond;
export type ToStringUnion = ToStringTagFirst | ToStringTagSecond;

@Route('union-properties')
export class UnionDiscriminatorPropertiesController {
  @Post('constructor')
  public constructorTag(@Body() body: ConstructorUnion): ConstructorUnion {
    return body;
  }

  @Post('toString')
  public toStringTag(@Body() body: ToStringUnion): ToStringUnion {
    return body;
  }
}
