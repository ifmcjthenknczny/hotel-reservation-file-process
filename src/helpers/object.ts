export const mergeHeadersWithValues = <T extends Record<string, any>>(
  headers: (keyof T)[],
  values: any[],
): T => {
  return headers.reduce((obj, key, index) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { ...obj, [key]: values[index] ?? null };
  }, {} as T);
};

export const areSetsEqual = <T>(setA: Set<T>, setB: Set<T>): boolean => {
  if (setA.size !== setB.size) {
    return false;
  }
  for (const item of setA) {
    if (!setB.has(item)) {
      return false;
    }
  }
  return true;
};

export const isRowEmpty = <T extends Record<string, any>>(rowJson: T) => {
  return Object.values(rowJson).every(
    (rowValue) => rowValue === null || rowValue === undefined,
  );
};
