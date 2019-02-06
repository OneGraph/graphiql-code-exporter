export default {
  name: 'graphqlclient',
  language: 'Python',
  prismLanguage: 'python',
  options: [],
  generate: ({serverUrl, operation, headers, variables}) => `
from graphqlclient import GraphQLClient

serverUrl = '${serverUrl}'
client = GraphQLClient(serverUrl)

${Object.keys(headers)
  .map(
    header =>
      "client.inject_token('" + headers[header] + "', '" + header + "')",
  )
  .filter(Boolean)}

data = client.execute('''
${operation}
''', ${JSON.stringify(variables, null, 2)})

print(data)
`,
};
