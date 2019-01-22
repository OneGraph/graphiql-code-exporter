# Code Exporter for GraphiQL

A GraphiQL addon that generates ready-to-run code for your queries and mutations.    
It provides a wide range of default snippets, but is also extendable with custom snippets.

> Read the [introduction blog post]() to learn why and how we built it!

> TODO: DEMO HERE

## Installation

```sh
# yarn 
yarn add graphiql-code-exporter

# npm
npm i --save graphiql-code-exporter
```

## Usage

```javascript
import React, { Component, Fragment } from 'react'
import GraphiQL from 'graphiql'
import CodeExporter from 'graphiql-code-exporter'

const serverUrl = /* your server url here */

export default class GraphiQLWithCodeExporter extends Component {
  state = { 
    codeExporterIsVisible: false, 
    query: '' 
  }

  toggleCodeExporter = () => this.setState({
    codeExporterIsVisible: !this.state.codeExporterIsVisible
  })

  updateQuery = query => this.setState({
    query
  })

  render() {
    const { query, codeExporterIsVisible } = this.state

    const codeExporter = codeExporterIsVisible ? (
      <CodeExporter 
        hideCodeExporter={this.toggleCodeExporter}
        snippets={snippets}
        serverUrl={serverUrl}
        query={query}
      />
    ) : null

    return (
      <Fragment>
        <GraphiQL
          onEditQuery={this.updateQuery}
          query={query}>
          <GraphiQL.Button
            onClick={this.toggleCodeExporter}
            label="Code Exporter"
            title="Toggle Code Exporter"
          />
        </GraphiQL>
        {codeExporter}
      </Fragment>
    )
  }
}
``` 

## Props
| Property | Type | Description |
| ---- | --- | ---- |
| hideCodeExporter | *(Function)* | A callback function that is called when clicking the close (x) button in the upper right corner of the panel. | 
| serverUrl | *(URI)* | The server url for your GraphQL endpoint. |
| query | *(string)* | A string containing the GraphQL query that is synced with the GraphiQL query editor. |
| snippets | *(Snippet[])* | A list of snippet objects that one can choose from to generate code snippets. |
| theme | *(string)* | The name of the [highlight.js theme](https://highlightjs.org/static/demo/) in lower case and with '-' instead of spaces e.g. `solarized-light`.  Defaults to `github` |

## Snippets

What we call **snippet** here, is actually an object with 4 required keys.

| Key | Type | Description |
| --- | --- | ---- |
| name | *(string)* | A name that is used to identify the snippet. |
| language | *(string)* | A language string that is used to group the snippets by language. It is also used to highlight the code so it should match the [highlight.js]() language list. | 
| options | *(Option[])* | Options are rendered as checkboxes and can be used to customize snippets. They must have an unique id, a label and an initial value of either true or false. |
| generate | *(Function)* | A function that returns the generated code as a single string. It receives below listed arguments as an object. |

#### Arguments
1. `serverUrl` (*string*): The passed GraphQL server url
2. `operationName` (*string*): The selected GraphQL operation name
3. `operationType` (*"query" | "mutation"*): The selected operation's type
4.  `variableName` (*string*): The operation name but in UPPER_CASE as that's the common way to declare GraphQL operations in JavaScript 
5. `operation` (*string*): The selected operation as a query string
6. `options` (*Object*): A map of option-boolean pairs providing whether an option is selected or not

#### Example

The following example implements a subset of the build-in *Fetch API* snippet.    
The output will look similar to the demo above.

```javascript
const fetchSnippet = {
  language: 'JavaScript',
  name: 'Fetch API',
  options: [{
    id: 'server',
    label: 'server-side usage',
    initial: false,
  }],
  generate: ({
    serverUrl,
    operation,
    options
  }) => {
    const serverImport = options.server ? 'import { fetch } from "node-fetch"' : ''

    return `
${serverImport}

const res = await fetch("${serverUrl}", {
  method: 'POST',
  body: JSON.stringify({ query: \`${operation}\` }),
})
const { errors, data } = await res.json()

// Do something with the response
console.log(data, errors)
`
  }
}
```



## License
graphiql-code-exporter is licensed under the [MIT License](http://opensource.org/licenses/MIT).<br>
Documentation is licensed under [Creative Common License](http://creativecommons.org/licenses/by/4.0/).<br>
Created with ♥ by [@rofrischmann](http://rofrischmann.de) and all the great contributors.