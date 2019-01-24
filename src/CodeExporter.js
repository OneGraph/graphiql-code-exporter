import React, {Component} from 'react';
import {Button, Icon, Tooltip} from 'antd';
import copy from 'copy-to-clipboard';
import {parse, print} from 'graphql/language';
import {highlightAuto, registerLanguage} from 'highlight.js/lib/highlight';

// TODO: can we use plain graphiql nodes or do we need @onegraph?
import GraphiQL from '@onegraph/graphiql';

// TODO: not sure if we should include all snippets by default
import defaultSnippets from './snippets';

function formatVariableName(name) {
  var uppercasePattern = /[A-Z]/g;

  return (
    name.charAt(0).toUpperCase() +
    name
      .slice(1)
      .replace(uppercasePattern, '_$&')
      .toUpperCase()
  );
}

const getInitialOptions = snippet =>
  snippet.options.reduce((newOptions, option) => {
    newOptions[option.id] = {
      label: option.label,
      value: option.initial,
    };

    return newOptions;
  }, {});

// TODO: filter subscriptions
const getOperations = query => {
  let operations = [];
  try {
    operations = parse(query).definitions;
  } catch (e) {}

  return operations;
};

const getOperationName = operation =>
  operation.name ? operation.name.value : operation.operation;

const getOperationDisplayName = operation =>
  operation.name
    ? operation.name.value
    : '<Unnamed:' + operation.operation + '>';

class CodeExporter extends Component {
  constructor(props, context) {
    super(props, context);

    const {initialSnippet, snippets} = props;

    if (!snippets || snippets.length === 0) {
      // TODO: throw
      return false;
    }

    const snippet = initialSnippet || snippets[0];

    this.state = {
      showCopiedTooltip: false,
      options: getInitialOptions(snippet),
      snippet,
      query: props.query,
      operationIndex: 0,
    };
  }

  componentDidMount() {
    const style = document.createElement('link');
    style.setAttribute('rel', 'stylesheet');
    style.setAttribute(
      'href',
      '//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/' +
        this.props.theme +
        '.min.css',
    );

    document.head.appendChild(style);
    this.style = style;

    this.languages = [];
    this.props.snippets.forEach(snippet => {
      const lang = snippet.language.toLowerCase();

      if (this.languages.indexOf(lang) === -1) {
        const langSupport = require('highlight.js/lib/languages/' + lang);
        registerLanguage(lang, langSupport);
        this.languages.push(lang);
      }
    });
  }

  componentWillUnmount() {
    this.style.remove();
  }

  static getDerivedStateFromProps(props, state) {
    // for now we do not support subscriptions, might add those later
    const operations = getOperations(props.query).filter(
      op => op.operation !== 'subscription',
    );
    const operation = operations[state.operationIndex] || operations[0];

    return {
      operations,
      operation,
      operationIndex: state.operationIndex,
      query: props.query,
    };
  }

  setSnippet = name => {
    const snippet = this.props.snippets.find(
      snippet =>
        snippet.name === name &&
        snippet.language === this.state.snippet.language,
    );

    this.setState({
      options: getInitialOptions(snippet),
      snippet,
    });
  };

  setLanguage = language => {
    const snippet = this.props.snippets.find(
      snippet => snippet.language === language,
    );

    this.setState({
      options: getInitialOptions(snippet),
      snippet,
    });
  };

  setOption = (id, value) =>
    this.setState({
      options: {
        ...this.state.options,
        [id]: {
          ...this.state.options[id],
          value: value,
        },
      },
    });

  render() {
    const {serverUrl, snippets} = this.props;
    const {
      snippet,
      options,
      operations,
      operation,
      operationIndex,
      showCopiedTooltip,
    } = this.state;

    if (!operation || !snippet) {
      return null;
    }

    const {name, language, generate} = snippet;

    console.log(this.languages);

    const operationName = getOperationName(operation);
    const operationDisplayName = getOperationDisplayName(operation);
    const query = print(operation);

    let codeSnippet = generate({
      serverUrl,
      operation: query,
      operationType: operation.operation,
      variableName: formatVariableName(operationName),
      operationName,
      options: Object.keys(options).reduce((flags, id) => {
        flags[id] = options[id].value;
        return flags;
      }, {}),
    });

    const rawSnippet = codeSnippet;
    // we use a try catch here because otherwise highlight might break the render
    try {
      codeSnippet = highlightAuto(codeSnippet, [language.toLowerCase()]).value;
    } catch (e) {}

    return (
      <div>
        <div
          style={{
            fontFamily:
              'system, -apple-system, San Francisco, Helvetica Neue, arial, sans-serif',
          }}>
          <div
            style={{
              padding: '10px 7px',
              borderBottom: '1px solid rgb(220, 220, 220)',
            }}>
            <GraphiQL.Menu label={operationDisplayName} title="Operation">
              {operations.map((op, index) => (
                <li onClick={() => this.setState({operationIndex: index})}>
                  {getOperationDisplayName(op)}
                </li>
              ))}
            </GraphiQL.Menu>
          </div>
          <div
            style={{
              padding: '10px 7px 5px 7px',
            }}>
            <GraphiQL.Menu label={language} title="Language">
              {snippets
                .map(snippet => snippet.language)
                .filter((lang, index, arr) => arr.indexOf(lang) === index)
                .sort((a, b) => a > b || -1)
                .map(lang => (
                  <li onClick={() => this.setLanguage(lang)}>{lang}</li>
                ))}
            </GraphiQL.Menu>
            <GraphiQL.Menu label={name} title="Mode">
              {snippets
                .filter(snippet => snippet.language === language)
                .map(snippet => snippet.name)
                .sort((a, b) => a.toLowerCase() > b.toLowerCase() || -1)
                .map(snippetName => (
                  <li onClick={() => this.setSnippet(snippetName)}>
                    {snippetName}
                  </li>
                ))}
            </GraphiQL.Menu>
          </div>
          {snippet.options.length > 0 ? (
            <div style={{padding: '0px 11px 10px'}}>
              <div
                style={{
                  fontWeight: 700,
                  color: 'rgb(177, 26, 4)',
                  fontVariant: 'small-caps',
                  textTransform: 'lowercase',
                }}>
                Options
              </div>
              {Object.keys(options)
                .sort((a, b) => a > b || -1)
                .map(optionId => (
                  <div key={optionId}>
                    <input
                      id={optionId}
                      type="checkbox"
                      style={{position: 'relative', top: -1}}
                      value={options[optionId].value}
                      onChange={() =>
                        this.setOption(optionId, !options[optionId].value)
                      }
                    />
                    <label for={optionId} style={{paddingLeft: 5}}>
                      {options[optionId].label}
                    </label>
                  </div>
                ))}
            </div>
          ) : (
            <div style={{minHeight: 8}} />
          )}
        </div>
        <Tooltip
          title="Copied!"
          visible={showCopiedTooltip}
          overlayStyle={{fontSize: 10}}>
          <Button
            style={{
              fontSize: '1.2em',
              padding: 0,
              position: 'absolute',
              left: 350,
              marginTop: -20,
              width: 40,
              height: 40,
              backgroundColor: 'white',
              borderRadius: 40,
              boxShadow: '0 0 1px black',
            }}
            type="link"
            onClick={() => {
              copy(rawSnippet);
              this.setState({showCopiedTooltip: true}, () =>
                setTimeout(
                  () => this.setState({showCopiedTooltip: false}),
                  450,
                ),
              );
            }}>
            <Icon type="copy" />
          </Button>
        </Tooltip>
        <pre
          className="hljs"
          style={{
            padding: '15px 12px',
            margin: 0,
          }}>
          <code
            style={{
              fontFamily:
                'Dank Monk, Fira Code, Hack, Consolas, Inconsolata, Droid Sans Mono, Monaco, monospace',
              textRendering: 'optimizeLegibility',
              fontSize: 12,
            }}
            dangerouslySetInnerHTML={{
              __html: codeSnippet,
            }}
          />
          <div style={{minHeight: 10}} />
        </pre>
      </div>
    );
  }
}

// we borrow class names from graphiql's CSS as the visual appearance is the same
// yet we might want to change that at some point in order to have a self-contained standalone
export default function CodeExporterWrapper({
  query,
  serverUrl,
  theme = 'github',
  hideCodeExporter = () => {},
  snippets = defaultSnippets,
}) {
  return (
    <div
      className="historyPaneWrap"
      style={{
        width: 440,
        zIndex: 7,
      }}>
      <div className="history-title-bar">
        <div className="history-title">Code Exporter</div>
        <div className="doc-explorer-rhs">
          <div className="docExplorerHide" onClick={hideCodeExporter}>
            {'\u2715'}
          </div>
        </div>
      </div>
      <div
        className="history-contents"
        style={{borderTop: '1px solid #d6d6d6'}}>
        <CodeExporter
          query={query}
          serverUrl={serverUrl}
          snippets={snippets}
          theme={theme}
        />
      </div>
    </div>
  );
}
