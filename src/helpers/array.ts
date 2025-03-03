export const chunkify = <T>(array: T[], chunkSize: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
};

export const findDuplicateValueIndexes = <T extends string | number>(
  arr: T[],
): Record<T, number[]> => {
  const indexMap = {} as Record<T, number[]>;

  arr.forEach((value, index) => {
    if (!indexMap[value]) {
      indexMap[value] = [];
    }
    indexMap[value].push(index);
  });

  const result = {} as Record<T, number[]>;
  for (const key in indexMap) {
    if (indexMap[key].length > 1) {
      result[key] = indexMap[key];
    }
  }
  return result;
};
