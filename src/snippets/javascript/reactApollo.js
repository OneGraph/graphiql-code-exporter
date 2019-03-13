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
    variables,
    headers,
    variableName,
    operationType,
    operationName,
    operation,
    options,
  }) => {
    const graphqlOperation = `const ${variableName} = gql\`
${operation}\``;

    const element = options.reactNative ? 'View' : 'div';
    const vars = JSON.stringify(variables, null, 2);
    const heads = JSON.stringify(headers, null, 2);

    let component;

    if (operationType === 'query') {
      component = `
<Query query={${variableName}} context={{ headers: ${heads} }} variables={${vars}}>
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
    <Mutation mutation={${variableName}} context={{ headers: ${heads} }}>
    {(${operationName}, { loading, error, data }) => {
      if (loading) return <${element}>Loading</${element}>
      if (error) return <${element}>Error</${element}>

      // call ${operationName}() to run the mutation
      return <button onClick={() => ${operationName}({ variables: ${vars} })}>Mutate</button>
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
      ? `\nimport { ApolloClient, InMemoryCache, HttpLink } from 'apollo-boost'`
      : '';
    const gqlImport = 'import gql from "graphql-tag"';

    const snippet = `
${gqlImport}${clientImports}
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

    return snippet;
  },
};
