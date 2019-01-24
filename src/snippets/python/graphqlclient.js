export default {
  name: 'graphqlclient',
  language: 'Python',
  options: [],
  generate: ({serverUrl, operation}) => `
from graphqlclient import GraphQLClient

serverUrl = '${serverUrl}'
client = GraphQLClient(serverUrl)

data = client.execute('''
${operation}
''')

print(data)
`,
};
