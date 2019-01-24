import refmt from 'reason'

import capitalizeFirstLetter from '../utils/capitalizeFirstLetter'

export default {
  language: 'ReasonML',
  name: 'reason-apollo',
  options: [
    {
      id: 'client',
      label: 'with ApolloClient',
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
    const queryName = capitalizeFirstLetter(operationName)
    const componentName = queryName + capitalizeFirstLetter(operationType)

    const apolloClient = options.client
      ? `
  
    let inMemoryCache = ApolloInMemoryCache.createInMemoryCache();
    
    let serverUrl = "${serverUrl}"
    let httpLink =
      ApolloLinks.createHttpLink(~uri=serverUrl, ());
    
    let instance =
      ReasonApollo.createApolloClient(~link=httpLink, ~cache=inMemoryCache, ());
      `
      : ''

    return refmt.printRE(
      refmt.parseRE(`   
${apolloClient}

module ${queryName} = [%graphql
{|
${operation}
|}
];

module ${componentName} = ReasonApollo.CreateQuery(${queryName});

let make = _children => {
  render: _ => {
    ${options.client ? '<ReasonApollo.Provider client=instance>' : ''}
    <${componentName}>
      ...{
            ({result}) =>
              switch (result) {
              | Loading => <div> {ReasonReact.string("Loading")} </div>
              | Error(error) =>
                <div> {ReasonReact.string(error##message)} </div>
              | Data(response) =>
                <div> {
                /* Handle response */
                } </div>
              }
          }
    </${componentName}>
    ${options.client ? '</ReasonApollo.Provider>' : ''}
  }
};`)
    )
  },
}
