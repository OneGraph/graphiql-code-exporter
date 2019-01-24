import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';

export default {
  language: 'Ruby',
  name: 'graphql-client',
  options: [],
  generate: ({
    serverUrl,
    variableName,
    operationType,
    operationName,
    operation,
    options,
  }) => {
    const queryName =
      capitalizeFirstLetter(operationName) +
      capitalizeFirstLetter(operationType);

    return `
require "graphql/client"
require "graphql/client/http"

ServerUrl = "${serverUrl}"
HTTP = GraphQL::Client::HTTP.new(ServerUrl)
Schema = GraphQL::Client.load_schema(HTTP)
Client = GraphQL::Client.new(schema: Schema, execute: HTTP)

${queryName} = Client.parse <<-'GRAPHQL'
${operation}
GRAPHQL


result = Client.query(${queryName})
puts(result)`;
  },
};
