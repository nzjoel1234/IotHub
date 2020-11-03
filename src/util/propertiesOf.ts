export const propertiesOf = <TObj>(obj?: TObj) =>
  new Proxy({}, {
    get: (_, prop) => prop,
    set: () => {
      throw Error('Set not supported');
    },
  }) as {
    [P in keyof TObj]: P;
  };

export default propertiesOf;
