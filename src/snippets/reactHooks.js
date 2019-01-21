import formatJavaScript from '../utils/formatJavaScript';
import commentsFactory from '../utils/commentsFactory';
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';

const comments = {
  effectEmptyArray: `empty array to only fetch on did mount\n`,
  finallyLoading: `finally makes sures loading is set to false in any case\n`,
};
export default {
  language: 'JavaScript',
  name: 'React: Hooks',
  options: [{id: 'comments', label: 'show comments', initial: false}],
  getSnippet: ({
    serverUrl,
    variableName,
    operationType,
    operationName,
    operation,
    options,
  }) => {
    const getComment = commentsFactory(options.comments, comments);

    const reactImport = `import React, { useState, useEffect } from "react"\n`;

    const graphqlQuery = `const ${variableName} = \`
  ${operation}\``;

    const urlVariable = `const serverUrl = "${serverUrl}"`;

    const fetchBody = `fetch(serverUrl, {
    method: 'POST',
    body: JSON.stringify({ query: ${variableName} }),
  })
    .then(res => res.json())
    .then(({ data, errors }) => {
      if (errors) {
        setErrors(errors)
      }
      
      setData(data)
    })
    .catch(err => setErrors([err]))
    ${getComment('finallyLoading')}.finally(() => setLoading(false))
  `;

    const snippet = `
${reactImport}
${graphqlQuery}

${urlVariable}

function ${capitalizeFirstLetter(operationName)}() {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [data, setData] = useState(null)

  useEffect(
    () => {
      setLoading(true)
      
      ${fetchBody}
    },
    ${getComment('effectEmptyArray')}[]
  )

  if (loading) return <div>Loading</div>
  if (errors.length > 0) return <div>{JSON.stringify(errors)}</div>

  return (
    <div>{JSON.stringify(data, null, 2)}</div>
  )
}`;

    return formatJavaScript(snippet);
  },
};
