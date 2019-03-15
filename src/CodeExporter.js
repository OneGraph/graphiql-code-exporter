// @flow

import React, {Component} from 'react';
import copy from 'copy-to-clipboard';
import {parse, print} from 'graphql';
// $FlowFixMe: can't find module
import CodeMirror from 'codemirror';

import type {
  OperationDefinitionNode,
  VariableDefinitionNode,
  OperationTypeNode,
} from 'graphql';

function formatVariableName(name: string) {
  var uppercasePattern = /[A-Z]/g;

  return (
    name.charAt(0).toUpperCase() +
    name
      .slice(1)
      .replace(uppercasePattern, '_$&')
      .toUpperCase()
  );
}

const copyIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24">
    <path fill="none" d="M0 0h24v24H0V0z" />
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4H8c-1.1 0-1.99.9-1.99 2L6 21c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V11l-6-6zM8 21V7h6v5h5v9H8z" />
  </svg>
);

export type Variables = {[key: string]: ?mixed};

// TODO: Need clearer separation between option defs and option values
export type Options = Array<{id: string, label: string, initial: boolean}>;

export type OptionValues = {[id: string]: boolean};

export type OperationData = {
  query: string,
  name: string,
  displayName: string,
  type: OperationTypeNode,
  variableName: string,
  variables: Variables,
  operationDefinition: OperationDefinitionNode,
};

export type GenerateOptions = {
  serverUrl: string,
  headers: {[name: string]: string},
  context: Object,
  operationDataList: Array<OperationData>,
  options: OptionValues,
};

export type Snippet = {
  options: Options,
  language: string,
  codeMirrorMode: string,
  name: string,
  generate: (options: GenerateOptions) => string,
};

let operationNodesMemo: [?string, ?Array<OperationDefinitionNode>] = [
  null,
  null,
];
function getOperationNodes(query: string): Array<OperationDefinitionNode> {
  if (operationNodesMemo[0] === query && operationNodesMemo[1]) {
    return operationNodesMemo[1];
  }
  const operationDefinitions = [];
  try {
    for (const def of parse(query).definitions) {
      if (
        def.kind === 'OperationDefinition' &&
        def.operation !== 'subscription'
      ) {
        operationDefinitions.push(def);
      }
    }
  } catch (e) {}
  operationNodesMemo = [query, operationDefinitions];
  return operationDefinitions;
}

const getUsedVariables = (
  variables: Variables,
  operationDefinition: OperationDefinitionNode,
): Variables => {
  return (operationDefinition.variableDefinitions || []).reduce(
    (usedVariables, variable: VariableDefinitionNode) => {
      const variableName = variable.variable.name.value;
      if (variables[variableName]) {
        usedVariables[variableName] = variables[variableName];
      }

      return usedVariables;
    },
    {},
  );
};

const getOperationName = (operationDefinition: OperationDefinitionNode) =>
  operationDefinition.name
    ? operationDefinition.name.value
    : operationDefinition.operation;

const getOperationDisplayName = operationDefinition =>
  operationDefinition.name
    ? operationDefinition.name.value
    : '<Unnamed:' + operationDefinition.operation + '>';

/**
 * ToolbarMenu
 *
 * A menu style button to use within the Toolbar.
 * Copied from GraphiQL: https://github.com/graphql/graphiql/blob/272e2371fc7715217739efd7817ce6343cb4fbec/src/components/ToolbarMenu.js#L16-L80
 */
export class ToolbarMenu extends Component<
  {title: string, label: string, children: React$Node},
  {visible: boolean},
> {
  state = {visible: false};
  _node: ?HTMLAnchorElement;
  _listener: ?(e: Event) => void;

  componentWillUnmount() {
    this._release();
  }

  render() {
    const visible = this.state.visible;
    return (
      <a
        className="toolbar-menu toolbar-button"
        onClick={this.handleOpen}
        onMouseDown={e => e.preventDefault()}
        ref={node => {
          this._node = node;
        }}
        title={this.props.title}>
        {this.props.label}
        <svg width="14" height="8">
          <path fill="#666" d="M 5 1.5 L 14 1.5 L 9.5 7 z" />
        </svg>
        <ul className={'toolbar-menu-items' + (visible ? ' open' : '')}>
          {this.props.children}
        </ul>
      </a>
    );
  }

  _subscribe() {
    if (!this._listener) {
      this._listener = this.handleClick.bind(this);
      document.addEventListener('click', this._listener);
    }
  }

  _release() {
    if (this._listener) {
      document.removeEventListener('click', this._listener);
      this._listener = null;
    }
  }

  handleClick(e: Event) {
    if (this._node !== e.target) {
      e.preventDefault();
      this.setState({visible: false});
      this._release();
    }
  }

  handleOpen = (e: Event) => {
    e.preventDefault();
    this.setState({visible: true});
    this._subscribe();
  };
}

type CodeDisplayProps = {code: string, mode: string, theme: ?string};

class CodeDisplay extends React.PureComponent<CodeDisplayProps, {}> {
  _node: ?HTMLDivElement;
  editor: CodeMirror;
  componentDidMount() {
    this.editor = CodeMirror(this._node, {
      value: this.props.code.trim(),
      lineNumbers: false,
      mode: this.props.mode,
      readOnly: 'nocursor',
      theme: this.props.theme,
    });
  }

  componentDidUpdate(prevProps: CodeDisplayProps) {
    if (this.props.code !== prevProps.code) {
      this.editor.setValue(this.props.code);
    }
    if (this.props.mode !== prevProps.mode) {
      this.editor.setOption('mode', this.props.mode);
    }
    if (this.props.theme !== prevProps.theme) {
      this.editor.setOption('theme', this.props.theme);
    }
  }

  render() {
    return <div ref={ref => (this._node = ref)} />;
  }
}

type Props = {|
  snippet: ?Snippet,
  snippets: Array<Snippet>,
  query: string,
  serverUrl: string,
  context: Object,
  variables: Variables,
  headers: {[name: string]: string},
  setOptionValue?: (id: string, value: boolean) => void,
  optionValues: OptionValues,
  codeMirrorTheme: ?string,
  onSelectSnippet: ?(snippet: Snippet) => void,
  onSetOptionValue: ?(snippet: Snippet, option: string, value: boolean) => void,
|};
type State = {|
  showCopiedTooltip: boolean,
  optionValuesBySnippet: Map<Snippet, OptionValues>,
  snippet: ?Snippet,
|};

class CodeExporter extends Component<Props, State> {
  style: ?HTMLLinkElement;
  state = {
    showCopiedTooltip: false,
    optionValuesBySnippet: new Map(),
    snippet: null,
  };

  _activeSnippet = (): Snippet =>
    this.props.snippet || this.state.snippet || this.props.snippets[0];

  setSnippet = (snippet: Snippet) => {
    this.props.onSelectSnippet && this.props.onSelectSnippet(snippet);
    this.setState({snippet});
  };

  setLanguage = (language: string) => {
    const snippet = this.props.snippets.find(
      snippet => snippet.language === language,
    );

    if (snippet) {
      this.setSnippet(snippet);
    }
  };

  handleSetOptionValue = (snippet: Snippet, id: string, value: boolean) => {
    this.props.onSetOptionValue &&
      this.props.onSetOptionValue(snippet, id, value);
    const {optionValuesBySnippet} = this.state;
    const snippetOptions = optionValuesBySnippet.get(snippet) || {};
    optionValuesBySnippet.set(snippet, {...snippetOptions, [id]: value});

    return this.setState({optionValuesBySnippet});
  };

  getOptionValues = (snippet: Snippet) => {
    const snippetDefaults = snippet.options.reduce(
      (acc, option) => ({...acc, [option.id]: option.initial}),
      {},
    );
    return {
      ...snippetDefaults,
      ...(this.state.optionValuesBySnippet.get(snippet) || {}),
      ...this.props.optionValues,
    };
  };

  render() {
    const {
      serverUrl,
      query,
      snippets,
      context = {},
      variables = {},
      headers = {},
    } = this.props;
    const {showCopiedTooltip} = this.state;

    const snippet = this._activeSnippet();
    const operationDefinitions = getOperationNodes(query);

    const {name, language, generate} = snippet;

    const operationDataList: Array<OperationData> = operationDefinitions.map(
      (operationDefinition: OperationDefinitionNode) => ({
        query: print(operationDefinition),
        name: getOperationName(operationDefinition),
        displayName: getOperationDisplayName(operationDefinition),
        type: operationDefinition.operation,
        variableName: formatVariableName(getOperationName(operationDefinition)),
        variables: getUsedVariables(variables, operationDefinition),
        operationDefinition,
      }),
    );

    const optionValues = this.getOptionValues(snippet);

    const codeSnippet = operationDefinitions.length
      ? generate({
          serverUrl,
          headers,
          context,
          operationDataList,
          options: optionValues,
        })
      : null;

    const languages = [
      ...new Set(snippets.map(snippet => snippet.language)),
    ].sort((a, b) => a.localeCompare(b));

    return (
      <div className="graphiql-code-exporter" style={{minWidth: 410}}>
        <div
          style={{
            fontFamily:
              'system, -apple-system, San Francisco, Helvetica Neue, arial, sans-serif',
          }}>
          <div style={{padding: '12px 7px 8px'}}>
            <ToolbarMenu label={language} title="Language">
              {languages.map((lang: string) => (
                <li onClick={() => this.setLanguage(lang)}>{lang}</li>
              ))}
            </ToolbarMenu>
            <ToolbarMenu label={name} title="Mode">
              {snippets
                .filter(snippet => snippet.language === language)
                .map(snippet => (
                  <li onClick={() => this.setSnippet(snippet)}>
                    {snippet.name}
                  </li>
                ))}
            </ToolbarMenu>
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
              {snippet.options.map(option => (
                <div key={option.id}>
                  <input
                    id={option.id}
                    type="checkbox"
                    style={{position: 'relative', top: -1}}
                    checked={optionValues[option.id]}
                    onChange={() =>
                      this.handleSetOptionValue(
                        snippet,
                        option.id,
                        !optionValues[option.id],
                      )
                    }
                  />
                  <label for={option.id} style={{paddingLeft: 5}}>
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div style={{minHeight: 8}} />
          )}
        </div>
        <button
          className={'toolbar-button'}
          style={{
            fontSize: '1.2em',
            padding: 0,
            position: 'absolute',
            left: 340,
            marginTop: -20,
            width: 40,
            height: 40,
            backgroundColor: 'white',
            borderRadius: 40,
            border: 'none',
            outline: 'none',
          }}
          type="link"
          onClick={() => {
            copy(codeSnippet);
            this.setState({showCopiedTooltip: true}, () =>
              setTimeout(() => this.setState({showCopiedTooltip: false}), 450),
            );
          }}>
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              left: '-15px',
              fontSize: 'small',
              padding: '6px 8px',
              color: '#fff',
              textAlign: 'left',
              textDecoration: 'none',
              wordWrap: 'break-word',
              backgroundColor: 'rgba(0,0,0,0.75)',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: showCopiedTooltip ? 'block' : 'none',
            }}
            pointerEvents="none">
            Copied!
          </div>
          {copyIcon}
        </button>
        <div
          style={{
            padding: '15px 12px',
            margin: 0,
            borderTop: '1px solid rgb(220, 220, 220)',
            fontSize: 12,
          }}>
          {codeSnippet ? (
            <CodeDisplay
              code={codeSnippet}
              mode={snippet.codeMirrorMode}
              theme={this.props.codeMirrorTheme}
            />
          ) : (
            <div>
              The query is invalid.
              <br />
              The generated code will appear here once the errors in the query editor are resolved.
            </div>
          )}
        </div>
      </div>
    );
  }
}

class ErrorBoundary extends React.Component<*, {hasError: boolean}> {
  state = {hasError: false};

  componentDidCatch(error, info) {
    this.setState({hasError: true});
    console.error('Error in component', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{fontFamily: 'sans-serif'}} className="error-container">
          Error generating code. Please{' '}
          <a
            href="https://spectrum.chat/onegraph"
            target="_blank"
            rel="noreferrer noopener">
            report your query on Spectrum
          </a>
          .
        </div>
      );
    }
    return this.props.children;
  }
}

type WrapperProps = {
  query: string,
  serverUrl: string,
  variables: string,
  context: Object,
  headers?: {[name: string]: string},
  hideCodeExporter: () => void,
  snippets: Array<Snippet>,
  snippet?: Snippet,
  codeMirrorTheme?: string,
  onSelectSnippet?: (snippet: Snippet) => void,
  onSetOptionValue?: (snippet: Snippet, option: string, value: boolean) => void,
  optionValues?: OptionValues,
};

// we borrow class names from graphiql's CSS as the visual appearance is the same
// yet we might want to change that at some point in order to have a self-contained standalone
export default function CodeExporterWrapper({
  query,
  serverUrl,
  variables,
  context = {},
  headers = {},
  hideCodeExporter = () => {},
  snippets,
  snippet,
  codeMirrorTheme,
  onSelectSnippet,
  onSetOptionValue,
  optionValues,
}: WrapperProps) {
  let jsonVariables: Variables = {};

  try {
    const parsedVariables = JSON.parse(variables);
    if (typeof parsedVariables === 'object') {
      jsonVariables = parsedVariables;
    }
  } catch (e) {}

  return (
    <div
      className="historyPaneWrap"
      style={{
        width: 440,
        minWidth: 440,
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
        {snippets.length ? (
          <ErrorBoundary>
            <CodeExporter
              query={query}
              serverUrl={serverUrl}
              snippets={snippets}
              snippet={snippet}
              context={context}
              headers={headers}
              variables={jsonVariables}
              codeMirrorTheme={codeMirrorTheme}
              onSelectSnippet={onSelectSnippet}
              onSetOptionValue={onSetOptionValue}
              optionValues={optionValues || {}}
            />
          </ErrorBoundary>
        ) : (
          <div style={{fontFamily: 'sans-serif'}} className="error-container">
            Please provide a list of snippets
          </div>
        )}
      </div>
    </div>
  );
}
