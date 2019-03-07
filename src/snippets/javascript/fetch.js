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
  prismLanguage: 'javascript',
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
  generate: ({serverUrl, headers, operations, context, options}) => {
    const {variableName, variables, query} = operations[0];

    console.log(operations);

    const getComment = commentsFactory(options.comments, comments);

    const serverComment = options.server ? getComment('nodeFetch') : '';
    const serverImport = options.server
      ? `import fetch from "node-fetch"\n`
      : '';

    const graphqlQuery = `const ${variableName} = \`
${query}\``;
    const urlVariable = `const serverUrl = "${serverUrl}"`;
    const vars = JSON.stringify(variables, null, 2);
    const heads = JSON.stringify(headers, null, 2);

    let fetchBody;
    if (options.asyncAwait) {
      fetchBody = `
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: ${heads},
      body: JSON.stringify({ query: ${variableName}, variables: ${vars} })
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
        headers: ${heads},
        body: JSON.stringify({ query: ${variableName}, variables: ${vars} })
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
