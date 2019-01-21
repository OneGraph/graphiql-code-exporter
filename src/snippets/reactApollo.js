import formatJavaScript from '../utils/formatJavaScript';
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';

export default {
  language: 'JavaScript',
  name: 'React: Apollo',
  options: [
    {
      id: 'client',
      label: 'with ApolloClient',
      initial: false,
    },
  ],

  getSnippet: ({
    serverUrl,
    variableName,
    operationType,
    operationName,
    operation,
    options,
  }) => {
    const graphqlOperation = `const ${variableName} = \`
${operation}\``;

    let component;

    if (operationType === 'query') {
      component = `
<Query query={${variableName}}>
{({ loading, error, data }) => {
  if (loading) return <div>Loading</div>
  if (error) return <div>Error</div>

  if (data) {
    return (
      <div>{JSON.stringify(data, null, 2)}</div>
    )
  }
}}
</Query>`;
    }

    if (operationType === 'mutation') {
      component = `
    <Mutation mutation={${variableName}}>
    {(${operationName}, { loading, error, data }) => {
      if (loading) return <div>Loading</div>
      if (error) return <div>Error</div>
    
      // call ${operationName}() to run the mutation
      return <button onClick={${operationName}}>Mutate</button>
    }}
    </Mutation>`;
    }

    const clientSetup = options.client
      ? `const apolloClient = new ApolloClient({
      cache: new InMemoryCache(),
link: new HttpLink({
  uri: "${serverUrl}",
}),
})\n`
      : '';

    const imports = [
      operationType === 'query' ? 'Query' : 'Mutation',
      options.client && 'ApolloProvider',
    ].filter(Boolean);

    const reactImports = `import { ${imports.join(', ')} } from 'react-apollo'`;
    const clientImports = options.client
      ? `import { ApolloClient, InMemoryCache, HttpLink } from 'apollo-boost'`
      : '';

    const snippet = `
  ${clientImports}
    ${reactImports}

${graphqlOperation}

${clientSetup}
function ${capitalizeFirstLetter(operationName)}() {
  return (
    ${options.client ? '<ApolloProvider client={apolloClient}>' : ''}
    ${component}  
    ${options.client ? '</ApolloProvider>' : ''} 
  )
}
`;

    return formatJavaScript(snippet);
  },
};
