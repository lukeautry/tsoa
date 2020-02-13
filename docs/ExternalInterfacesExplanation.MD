# Why am I getting this error?

`No matching model found for referenced type`

If you get that error, the most likely cause is that you are asking TSOA to create a swagger model from an interface that lives in an external dependency.

## Why is that a problem?

* Technical problem
  * TSOA can't currently get interfaces from node_modules. For performance reasons, TSOA should not be crawling all of the files in node_modules.
* Architectural/Quality problem
  * The consumers of the API you are writing do not want to have that API contract change on them. If your swagger/open-api documents/contracts were to be generated from external interfaces they would risk being changed any time that you update a library.

# Solution:

Create an interface that lives inside your own code base (i.e. it does not live in `./node_modules`) but that has the same structure.

## Detailed Solution

Here's the code that's getting the `No matching model found` error:
```ts
import * as externalDependency from 'some-external-dependency';

@Route('Users')
export class UsersController {

    /**
     * Create a user
     * @param request This is a user creation request description
     */
    @Post()
    public async Create(@Body() user: externalDependency.IUser): Promise<void> {
        return externalDependency.doStuff(user);
    }

}
```
And that external dependency has the following code:
```ts
// node_modules/someExternalDependency/index.d.ts

export interface IUser {
    name: string;
}

export function doStuff(user: IUser) {
    // ...
}
```

Here's how you solve it:
```ts
import * as externalDependency from 'some-external-dependency';

// a local copy:
interface IUserAbstraction {
    name: string
}

@Route('Users')
export class UsersController {

    /**
     * Create a user
     * @param request This is a user creation request description
     */
    @Post()
    public async Create(@Body() user: IUserAbstraction): Promise<void> {
        return externalDependency.doStuff(user);
    }

}
```

## Does that solution have any negatives?

While it may appear that having a duplicate interface may be a performance problem, the types are stripped out when TypeScript compiles. So there won't be a performance problem.

And you also don't have to worry about the duplicate interface acting as a replacement for the external library's interface. This will work just fine due to TypeScript's "structural subtyping." Here's an example.

Let's say you want to expose the `IHuman` interface because you need to call the `onlyAcceptsAHuman` function from a fictional NPM package called `HumanLogger`.

```ts
// node_modules/humanLogger/index.ts
export interface IHuman {
    name: string;
}

export function onlyAcceptsAHuman(human: IHuman){
    console.log(`I got a human with the name ${human.name}`
}
```
And here's your local code that has its own interface that has a different name but the same structure. The fact that the following code compiles shows that the two interfaces can be substituted for each other due to structural subtyping:
```ts
import * as humanLogger from 'human-logger';

// your own code

interface IPerson {
    name: string;
}

function makePerson(): IPerson {
   return {
      name: "Bob Smith"
   };
}

humanLogger.onlyAcceptsAHuman( makePerson() ); // <-- yay! It compiles!
```

# Quality Benefits of this approach

Abstraction layers are a valuable concept in programming. Here's a classic example of why it will help you and your API consumers.

Let's say that `some-external-dependency` changes their method to take a different data structure.

If tsoa were to update your swagger documentation to the new type, then your API consumers would get 400 BAD REQUEST errors. See here:

```ts
// node_modules/someExternalDependency/index.d.ts


export interface IUser {
    // name: string; // we used to accept "name" but now we don't
    firstName: string;
    lastName: string;
}

export function doStuff(user: IUser) {
    // ...
}
```
Now your swagger documentation has changed, but the API consumer hasn't been notified of the breaking contract. So they call the API:
```ts
const response = someHttpLib.post('/api/Users/', {
    name: "Bob Smith"
}); // Throw 400 error: "firstName is a required parameter"
```
We don't want our API consumers to have a new error pop up in their production applications, so instead we handle our internal change without having to bother our consumers:
```ts
import * as externalDependency from 'some-external-dependency';

// a local copy:
interface IUserAbstraction {
    name: string
}

@Route('Users')
export class UsersController {

    /**
     * Create a user
     * @param request This is a user creation request description
     */
    @Post()
    public async Create(@Body() user: IUserAbstraction): Promise<void> {
        const namePortions = user.name.split(" ");
        // translate the abstraction into the shape the library expects
        const libUser: externalDependency.IUser = {
            firstName: namePortions[0],
            lastName: namePortions[1]
        }
        return externalDependency.doStuff(user);
    }

}
```
