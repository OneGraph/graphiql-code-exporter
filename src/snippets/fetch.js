import formatJavaScript from '../utils/formatJavaScript'
import commentsFactory from '../utils/commentsFactory'

const comments = {
  nodeFetch: `Node doesn't implement fetch so we have to import it`,
  appId: `the OneGraph App Id`,
  graphqlError: `handle OneGraph errors`,
  graphqlData: `do something with data`,
  fetchError: `handle fetch error`,
}

// TODO: async/await
export default {
  language: 'JavaScript',
  name: 'Fetch API',
  options: [
    {
      id: 'comments',
      label: 'Show comments',
      initial: false,
    },
    {
      id: 'server',
      label: 'Server-side usage',
      initial: false,
    },
  ],
  getSnippet: ({
    appId,
    variableName,
    operationType,
    operationName,
    operation,
    options,
  }) => {
    const getComment = commentsFactory(options.comments, comments)

    const serverComment = options.server ? getComment('nodeFetch') : ''
    const serverImport = options.server
      ? `import fetch from "node-fetch"\n`
      : ''

    const graphqlQuery = `const ${variableName} = \`
  ${operation}\``
    const appIdVariable = `const APP_ID = "${appId}"`

    const fetchBody = `fetch('https://serve.onegraph.com/dynamic?app_id=' + APP_ID, {
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
  `

    const snippet = `
${serverComment}
${serverImport}
${graphqlQuery}

${getComment('appId')}
${appIdVariable}

${fetchBody}`

    return formatJavaScript(snippet)
  },
}
