entry points
```typescript

/**
 * @summary Write summary to swagger tag
 * @description Write description to swagger tag
 * 
 */
@CustomConrollerDirective/* <-- directive name */(Arguments/* <-- custom arguments */)
// example
@Conroller('/greeting')
export class GreetingConroller {
    @CustomMethodDirective/* <-- directive name */(Arguments/* <-- custom arguments */)
    greeting(): swaggerType /* <-- type should be defined*/ {
        ...
        return result;
    }
}
```
1. Controller class 
    1. add a new tag
        1. Name <- class name
        1. Description <- from JSDoc
    1. Controller decorators maybe change path
1. Methods
    1. add new endpoint
        1. Path from decorator
        1. Method from decorator
        1. decorator add methods to endpoint
        1. description from JSDoc
