import formatJavaScript from '../../utils/formatJavaScript';
import commentsFactory from '../../utils/commentsFactory';

const comments = {
  nodeFetch: `Node doesn't implement fetch so we have to import it`,
  graphqlError: `handle OneGraph errors`,
  graphqlData: `do something with data`,
  fetchError: `handle fetch error`,
};

export default {
  language: 'JavaScript',
  name: 'fetch',
  options: [
    {
      id: 'comments',
      label: 'show comments',
      initial: false,
    },
    {
      id: 'server',
      label: 'server-side usage',
      initial: false,
    },
    {
      id: 'asyncAwait',
      label: 'async/await',
      initial: false,
    },
  ],
  generate: ({
    serverUrl,
    variableName,
    operationType,
    operationName,
    operation,
    options,
  }) => {
    const getComment = commentsFactory(options.comments, comments);

    const serverComment = options.server ? getComment('nodeFetch') : '';
    const serverImport = options.server
      ? `import fetch from "node-fetch"\n`
      : '';

    const graphqlQuery = `const ${variableName} = \`
  ${operation}\``;
    const urlVariable = `const serverUrl = "${serverUrl}"`;

    let fetchBody;
    if (options.asyncAwait) {
      fetchBody = `
const res = await fetch(serverUrl, {
  method: 'POST',
  body: JSON.stringify({ query: ${variableName} }),
})
const { errors, data } = await res.json()

if (errors) {
  ${getComment('graphqlError')}
  console.error(errors)
}

${getComment('graphqlData')}
console.log(data)
`;
    } else {
      fetchBody = `fetch(serverUrl, {
    method: 'POST',
    body: JSON.stringify({ query: ${variableName} }),
  })
    .then(res => res.json())
    .then(({ data, errors }) => {
      if (errors) {
        ${getComment('graphqlError')}
        console.error(errors)
      }
  
      ${getComment('graphqlData')}
      console.log(data)
    })
    .catch(err => {
      ${getComment('fetchError')}
      console.error(err)
    })
  `;
    }

    const snippet = `
${serverComment}
${serverImport}
${graphqlQuery}

${urlVariable}

${fetchBody}`;

    return formatJavaScript(snippet);
  },
};
