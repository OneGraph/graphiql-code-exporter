import formatJavaScript from '../../utils/formatJavaScript';
import capitalizeFirstLetter from '../../utils/capitalizeFirstLetter';

export default {
  language: 'JavaScript',
  prismLanguage: 'jsx',
  name: 'react-apollo',
  options: [
    {
      id: 'client',
      label: 'with ApolloClient',
      initial: false,
    },
    {
      id: 'reactNative',
      label: 'react-native',
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
    const graphqlOperation = `const ${variableName} = \`
${operation}\``;

    const element = options.reactNative ? 'View' : 'div';

    let component;

    if (operationType === 'query') {
      component = `
<Query query={${variableName}}>
{({ loading, error, data }) => {
  if (loading) return <${element}>Loading</${element}>
  if (error) return <${element}>Error</${element}>

  if (data) {
    return (
      <${element}>{JSON.stringify(data, null, 2)}</${element}>
    )
  }
}}
</Query>`;
    }

    if (operationType === 'mutation') {
      component = `
    <Mutation mutation={${variableName}}>
    {(${operationName}, { loading, error, data }) => {
      if (loading) return <${element}>Loading</${element}>
      if (error) return <${element}>Error</${element}>
    
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
    const reactNativeImports = options.reactNative
      ? 'import { View } from "react-native"'
      : '';
    const clientImports = options.client
      ? `import { ApolloClient, InMemoryCache, HttpLink } from 'apollo-boost'`
      : '';

    const snippet = `
${clientImports}
${reactImports}
${reactNativeImports}

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
