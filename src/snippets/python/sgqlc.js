export default {
  name: 'sgqlc',
  language: 'Python',
  prismLanguage: 'python',
  options: [],
  generate: ({serverUrl, headers, variables, operation}) => `
from sgqlc.endpoint.http import HTTPEndpoint

serverUrl = '${serverUrl}'

query = '''
${operation}
'''

endpoint = HTTPEndpoint(serverUrl, ${JSON.stringify(headers, null, 2)})
data = endpoint(query, ${JSON.stringify(variables, null, 2)})

print(data)
`,
};
