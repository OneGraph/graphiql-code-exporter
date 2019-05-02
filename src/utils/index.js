function distinct<T>(array: Array<T>): Array<T> {
  return [...new Set(array)];
}

const unnamedSymbols = ['query', 'mutation', 'subscription'];

function isOperationNamed(operationData: OperationData): boolean {
  return unnamedSymbols.indexOf(operationData.name.trim()) === -1;
}

const findFirstNamedOperation = (
  operations: Array<OperationData>,
): ?OperationData => operations.find(isOperationNamed);

function addLeftWhitespace(s: string, padding: number): string {
  const pad = [...new Array(padding + 1)].join(' ');
  return s
    .split('\n')
    .map(x => `${pad}${x}`)
    .join('\n');
}

function collapseExtraNewlines(s: string): string {
  return s.replace(/\n{2,}/g, '\n\n');
}

export {
  distinct,
  findFirstNamedOperation,
  isOperationNamed,
  addLeftWhitespace,
  collapseExtraNewlines,
};
