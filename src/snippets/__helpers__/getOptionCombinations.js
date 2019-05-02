export default function getOptionCombinations(options) {
  const optionIds = options.map(option => option.id);
  const combinationCount = Math.pow(2, optionIds.length);

  return Array.from(Array(combinationCount).keys()).reduce(
    (combinations, index) => {
      const booleanValues = index
        .toString(2)
        .padStart(3, '0')
        .split('');

      const optionMap = optionIds.reduce((map, name, i) => {
        map[name] = Boolean(parseInt(booleanValues[i]));
        return map;
      }, {});

      combinations.push(optionMap);
      return combinations;
    },
    [],
  );
}
