/**
 * used to show a method as deprecated on swagger documentation
 */
export function Deprecated(): PropertyDecorator & ClassDecorator & ParameterDecorator {
  return () => {
    return;
  };
}
