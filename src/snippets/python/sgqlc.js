export default {
  name: 'sgqlc',
  language: 'Python',
  prismLanguage: 'python',
  options: [],
  generate: ({serverUrl, operation}) => `
from sgqlc.endpoint.http import HTTPEndpoint

serverUrl = '${serverUrl}'

query = '''
${operation}
'''

endpoint = HTTPEndpoint(serverUrl, {})
data = endpoint(query, {})

print(data)
`,
};
