export function pick<T extends { [key: string]: any }, K extends keyof T>(
  obj: T,
  keysToPick: K[],
): Pick<T, K> {
  return Object.keys(obj).reduce(
    (newObj, key) => {
      if (keysToPick.includes(key as K)) {
        return { ...newObj, [key]: obj[key] };
      }
      return newObj;
    },
    {} as Pick<T, K>,
  );
}
