// @flow

import capitalizeFirstLetter from '../../utils/capitalizeFirstLetter';
import commentsFactory from '../../utils/jsCommentsFactory.js';
import {
  isOperationNamed,
  collapseExtraNewlines,
  addLeftWhitespace,
} from '../../utils';

import 'codemirror/mode/javascript/javascript';

import type {Snippet, OperationData} from '../../index.js';

const snippetOptions = [
  {
    id: 'server',
    label: 'server-side usage',
    initial: false,
  },
  {
    id: 'asyncAwait',
    label: 'async/await',
    initial: true,
  },
];

const comments = {
  setup: `This setup is only needed once per application`,
  nodeFetch: `Node doesn't implement fetch so we have to import it`,
  graphqlError: `handle those errors like a pro`,
  graphqlData: `do something great with this precious data`,
  fetchError: `handle errors from fetch itself`,
};

function generateDocumentQuery(
  operationDataList: Array<OperationData>,
): string {
  const body = operationDataList
    .map(operationData => operationData.query)
    .join('\n\n')
    .trim();

  return `const operationsDoc = \`
${addLeftWhitespace(body, 2)}
\`;`;
}

const fetcherName = 'fetchGraphQL';

function operationFunctionName(operationData: OperationData) {
  const {type} = operationData;

  const prefix =
    type === 'query'
      ? 'fetch'
      : type === 'mutation'
      ? 'execute'
      : type === 'subscription'
      ? 'subscribeTo'
      : '';

  const fnName =
    prefix +
    (prefix.length > 0
      ? capitalizeFirstLetter(operationData.name)
      : operationData.name);

  return fnName;
}

// Promise-based functions
function promiseFetcher(serverUrl: string, headers: string): string {
  return `function ${fetcherName}(operationsDoc, operationName, variables) {
  return fetch(
    "${serverUrl}",
    {
      method: "POST",${
        headers
          ? `
      headers: {
${addLeftWhitespace(headers, 8)}
      },`
          : ''
      }
      body: JSON.stringify({
        query: operationsDoc,
        variables: variables,
        operationName: operationName
      })
    }
  ).then((result) => result.json());
}`;
}

function fetcherFunctions(operationDataList: Array<OperationData>): string {
  return operationDataList
    .map(operationData => {
      const fnName = operationFunctionName(operationData);
      const params = (
        operationData.operationDefinition.variableDefinitions || []
      ).map(def => def.variable.name.value);
      const variablesBody = params
        .map(param => `"${param}": ${param}`)
        .join(', ');
      const variables = `{${variablesBody}}`;
      return `function ${fnName}(${params.join(', ')}) {
  return ${fetcherName}(
    operationsDoc,
    "${operationData.name}",
    ${variables}
  );
}`;
    })
    .join('\n\n');
}

function promiseFetcherInvocation(
  getComment,
  operationDataList: Array<OperationData>,
  vars,
): string {
  return operationDataList
    .map(namedOperationData => {
      const params = (
        namedOperationData.operationDefinition.variableDefinitions || []
      ).map(def => def.variable.name.value);
      const variables = Object.entries(namedOperationData.variables || {}).map(
        ([key, value]) => `const ${key} = ${JSON.stringify(value, null, 2)};`,
      );
      return `${variables.join('\n')}

${operationFunctionName(namedOperationData)}(${params.join(', ')})
  .then(({ data, errors }) => {
    if (errors) {
      ${getComment('graphqlError')}
      console.error(errors);
    }
    ${getComment('graphqlData')}
    console.log(data);
  })
  .catch((error) => {
    ${getComment('fetchError')}
    console.error(error);
  });`;
    })
    .join('\n\n');
}

// Async-await-based functions
function asyncFetcher(serverUrl: string, headers: string): string {
  return `async function ${fetcherName}(operationsDoc, operationName, variables) {
  const result = await fetch(
    "${serverUrl}",
    {
      method: "POST",${
        headers
          ? `
      headers: {
${addLeftWhitespace(headers, 8)}
      },`
          : ''
      }
      body: JSON.stringify({
        query: operationsDoc,
        variables: variables,
        operationName: operationName
      })
    }
  );

  return await result.json();
}`;
}

function asyncFetcherInvocation(
  getComment,
  operationDataList: Array<OperationData>,
  vars,
): string {
  return operationDataList
    .map(namedOperationData => {
      const params = (
        namedOperationData.operationDefinition.variableDefinitions || []
      ).map(def => def.variable.name.value);
      const variables = Object.entries(namedOperationData.variables || {}).map(
        ([key, value]) => `const ${key} = ${JSON.stringify(value, null, 2)};`,
      );
      return `async function start${capitalizeFirstLetter(
        operationFunctionName(namedOperationData),
      )}(${params.join(', ')}) {
  const { errors, data } = await ${operationFunctionName(
    namedOperationData,
  )}(${params.join(', ')});

  if (errors) {
    ${getComment('graphqlError')}
    console.error(errors);
  }

  ${getComment('graphqlData')}
  console.log(data);
}

${variables.join('\n')}

start${capitalizeFirstLetter(
        operationFunctionName(namedOperationData),
      )}(${params.join(', ')});`;
    })
    .join('\n\n');
}

// Snippet generation!
const snippet: Snippet = {
  language: 'JavaScript',
  codeMirrorMode: 'javascript',
  name: 'fetch',
  options: snippetOptions,
  generate: opts => {
    const {serverUrl, headers, options} = opts;

    const operationDataList = opts.operationDataList.map(
      (operationData, idx) => {
        if (!isOperationNamed(operationData)) {
          return {
            ...operationData,
            name: `unnamed${capitalizeFirstLetter(operationData.type)}${idx +
              1}`.trim(),
            query:
              `# Consider giving this ${
                operationData.type
              } a unique, descriptive
# name in your application as a best practice
${operationData.type} unnamed${capitalizeFirstLetter(operationData.type)}${idx +
                1} ` +
              operationData.query
                .trim()
                .replace(/^(query|mutation|subscription) /i, ''),
          };
        } else {
          return operationData;
        }
      },
    );

    const getComment = commentsFactory(true, comments);

    const serverComment = options.server ? getComment('nodeFetch') : '';
    const serverImport = options.server
      ? `import fetch from "node-fetch";\n`
      : '';

    const graphqlQuery = generateDocumentQuery(operationDataList);
    const vars = JSON.stringify({}, null, 2);
    const headersValues = [];
    for (const header of Object.keys(headers)) {
      if (header && headers[header]) {
        headersValues.push(`"${header}": "${headers[header]}"`);
      }
    }
    const heads = headersValues.length ? `${headersValues.join(',\n')}` : '';

    const requiredDeps = [
      options.server ? '"node-fetch": "^2.5.0"' : null,
    ].filter(Boolean);

    const packageDeps =
      requiredDeps.length > 0
        ? `/*
Add these to your \`package.json\`:
${addLeftWhitespace(requiredDeps.join(',\n'), 2)}
*/
`
        : '';

    const fetcher = options.asyncAwait
      ? asyncFetcher(serverUrl, heads)
      : promiseFetcher(serverUrl, heads);

    const fetcherFunctionsDefs = fetcherFunctions(operationDataList);

    const fetcherInvocation = options.asyncAwait
      ? asyncFetcherInvocation(getComment, operationDataList, vars)
      : promiseFetcherInvocation(getComment, operationDataList, vars);

    const snippet = `
/*
This is an example snippet - you should consider tailoring it
to your service.
*/
${packageDeps}
${serverComment}
${serverImport}

${fetcher}

${graphqlQuery}

${fetcherFunctionsDefs}

${fetcherInvocation}`;

    return collapseExtraNewlines(snippet.trim());
  },
};

export default snippet;
