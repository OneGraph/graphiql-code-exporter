import snippetObject from '../sgqlc';

import getOptionCombinations from '../../__helpers__/getOptionCombinations';

const {options, generate} = snippetObject;
const optionCombinations = getOptionCombinations(options);

const testQuery = `
query testQuery {
  someData {
    id
  }
}
`;

const testMutation = `
mutation testMutation {
  addData(id: "id") {
    id
  }
}`;

describe('Generating a Python:react-apollo snippet', () => {
  it('should generate the correct query snippet', () => {
    optionCombinations.forEach(options => {
      const snippet = generate({
        serverUrl: 'https://api.myservice.com/',
        operation: testQuery,
        operationType: 'query',
        variableName: 'TEST_QUERY',
        operationName: 'testQuery',
        options,
      });

      expect({
        options,
        snippet: '\n' + snippet,
      }).toMatchSnapshot();
    });
  });

  it('should generate the correct mutation snippet', () => {
    optionCombinations.forEach(options => {
      const snippet = generate({
        serverUrl: 'https://api.myservice.com/',
        operation: testMutation,
        operationType: 'mutation',
        variableName: 'TEST_MUTATION',
        operationName: 'testMutation',
        options,
      });

      expect({
        options,
        snippet: '\n' + snippet,
      }).toMatchSnapshot();
    });
  });
});
