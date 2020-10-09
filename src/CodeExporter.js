// @flow
import React, {Component} from 'react';
import copy from 'copy-to-clipboard';
import {parse, print} from 'graphql';
// $FlowFixMe: can't find module
import CodeMirror from 'codemirror';
import toposort from './toposort.js';
import {saveAs} from 'file-saver';

import type {
  GraphQLSchema,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  VariableDefinitionNode,
  OperationTypeNode,
  SelectionSetNode,
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

const codesandboxIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 256 296"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid">
    <g>
      <path
        d="M115.497674,261.08837 L115.497674,154.478845 L23.8139535,101.729261 L23.8139535,162.501763 L65.8104558,186.8486 L65.8104558,232.549219 L115.497674,261.08837 Z M139.311628,261.714907 L189.916577,232.563707 L189.916577,185.779949 L232.186047,161.285235 L232.186047,101.27387 L139.311628,154.895035 L139.311628,261.714907 Z M219.971965,80.8276886 L171.155386,52.5391067 L128.292316,77.4106841 L85.1040206,52.5141067 L35.8521355,81.1812296 L127.765737,134.063073 L219.971965,80.8276886 Z M0,222.211907 L0,74.4948807 L127.986799,0 L256,74.1820085 L256,221.978632 L127.983954,295.72283 L0,222.211907 Z"
        fill="#000000"
      />
    </g>
  </svg>
);

const zipFileIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    x="0"
    y="0"
    width="20"
    height="20"
    enableBackground="new 0 0 48 48"
    version="1.1"
    viewBox="0 0 48 48"
    xmlSpace="preserve">
    <path d="M47.987 21.938a.99.99 0 00-.053-.264c-.011-.032-.019-.063-.033-.094a.957.957 0 00-.193-.285l-.001-.001L42 15.586V10c0-.022-.011-.041-.013-.063a1.028 1.028 0 00-.051-.257c-.011-.032-.019-.063-.034-.094a.997.997 0 00-.196-.293l-9-9a.97.97 0 00-.294-.196c-.03-.014-.06-.022-.091-.032a.937.937 0 00-.263-.052C32.039.01 32.021 0 32 0H7a1 1 0 00-1 1v14.586L.293 21.293l-.002.002a.98.98 0 00-.192.285c-.014.031-.022.062-.033.094a.953.953 0 00-.053.264C.011 21.96 0 21.978 0 22v19a1 1 0 001 1h5v5a1 1 0 001 1h34a1 1 0 001-1v-5h5a1 1 0 001-1V22c0-.022-.011-.04-.013-.062zM44.586 21H42v-2.586L44.586 21zm-6-12H33V3.414L38.586 9zM8 2h23v8a1 1 0 001 1h8v10H8V2zM6 18.414V21H3.414L6 18.414zM40 46H8v-4h32v4zm6-6H2V23h44v17z"></path>
    <path d="M14.582 27.766L18.356 27.766 14.31 36.317 14.31 38 20.6 38 20.6 36.164 16.571 36.164 20.6 27.613 20.6 25.964 14.582 25.964z"></path>
    <path d="M22.436 25.964H24.476V38H22.436z"></path>
    <path d="M32.542 26.72a2.82 2.82 0 00-1.097-.586 4.453 4.453 0 00-1.19-.17h-3.332V38h2.006v-4.828h1.428c.419 0 .827-.074 1.224-.221a2.9 2.9 0 001.054-.68c.306-.306.553-.688.739-1.148.187-.459.28-.994.28-1.606 0-.68-.105-1.247-.314-1.7a3.15 3.15 0 00-.798-1.097zm-1.283 4.285c-.306.334-.697.501-1.173.501H28.93v-3.825h1.156c.476 0 .867.147 1.173.442.306.295.459.765.459 1.411s-.153 1.136-.459 1.471z"></path>
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
  type: OperationTypeNode | 'fragment',
  variableName: string,
  variables: Variables,
  operationDefinition: OperationDefinitionNode | FragmentDefinitionNode,
  fragmentDependencies: Array<FragmentDefinitionNode>,
};

export type GenerateOptions = {
  serverUrl: string,
  headers: {[name: string]: string},
  context: Object,
  operationDataList: Array<OperationData>,
  options: OptionValues,
};

export type CodesandboxFile = {
  content: string | mixed,
};

export type CodesandboxFiles = {
  [filename: string]: CodesandboxFile,
};

export type Snippet = {
  options: Options,
  language: string,
  codeMirrorMode: string,
  name: string,
  generate: (options: GenerateOptions) => string,
  generateCodesandboxFiles?: ?(options: GenerateOptions) => CodesandboxFiles,
  generateZipFile?: ?(options: GenerateOptions) => {name: string, blob: Blob},
};

async function createCodesandbox(
  files: CodesandboxFiles,
): Promise<{sandboxId: string}> {
  const res = await fetch(
    'https://codesandbox.io/api/v1/sandboxes/define?json=1',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({files}),
    },
  );
  const json = await res.json();
  if (!json.sandbox_id) {
    throw new Error('Invalid response from Codesandbox API');
  } else {
    return {sandboxId: json.sandbox_id};
  }
}

let findFragmentDependencies = (
  operationDefinitions: Array<FragmentDefinitionNode>,
  def: OperationDefinitionNode | FragmentDefinitionNode,
): Array<FragmentDefinitionNode> => {
  const fragmentByName = (name: string) => {
    return operationDefinitions.find(def => def.name.value === name);
  };

  const findReferencedFragments = (
    selectionSet: SelectionSetNode,
  ): Array<FragmentDefinitionNode> => {
    const selections = selectionSet.selections;

    const namedFragments = selections
      .map(selection => {
        if (selection.kind === 'FragmentSpread') {
          return fragmentByName(selection.name.value);
        } else {
          return null;
        }
      })
      .filter(Boolean);

    const nestedNamedFragments: Array<FragmentDefinitionNode> = selections.reduce(
      (acc, selection) => {
        if (
          (selection.kind === 'Field' ||
            selection.kind === 'SelectionNode' ||
            selection.kind === 'InlineFragment') &&
          selection.selectionSet !== undefined
        ) {
          return acc.concat(findReferencedFragments(selection.selectionSet));
        } else {
          return acc;
        }
      },
      [],
    );

    return namedFragments.concat(nestedNamedFragments);
  };

  const selectionSet = def.selectionSet;

  return findReferencedFragments(selectionSet);
};

let operationNodesMemo: [
  ?string,
  ?Array<OperationDefinitionNode | FragmentDefinitionNode>,
] = [null, null];
function getOperationNodes(
  query: string,
): Array<OperationDefinitionNode | FragmentDefinitionNode> {
  if (operationNodesMemo[0] === query && operationNodesMemo[1]) {
    return operationNodesMemo[1];
  }
  const operationDefinitions = [];
  try {
    for (const def of parse(query).definitions) {
      if (
        def.kind === 'FragmentDefinition' ||
        def.kind === 'OperationDefinition'
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
  operationDefinition: OperationDefinitionNode | FragmentDefinitionNode,
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

const getOperationName = (
  operationDefinition: OperationDefinitionNode | FragmentDefinitionNode,
) =>
  operationDefinition.name
    ? operationDefinition.name.value
    : operationDefinition.operation;

const getOperationDisplayName = (operationDefinition): string =>
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
      // eslint-disable-next-line
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
      readOnly: true,
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
  onGenerateCodesandbox?: ?({sandboxId: string}) => void,
  schema: ?GraphQLSchema,
|};
type State = {|
  showCopiedTooltip: boolean,
  optionValuesBySnippet: Map<Snippet, OptionValues>,
  snippet: ?Snippet,
  codesandboxResult:
    | null
    | {type: 'loading'}
    | {type: 'success', sandboxId: string}
    | {type: 'error', error: string},
|};

class CodeExporter extends Component<Props, State> {
  style: ?HTMLLinkElement;
  state = {
    showCopiedTooltip: false,
    optionValuesBySnippet: new Map(),
    snippet: null,
    codesandboxResult: null,
  };

  _activeSnippet = (): Snippet =>
    this.props.snippet || this.state.snippet || this.props.snippets[0];

  setSnippet = (snippet: Snippet) => {
    this.props.onSelectSnippet && this.props.onSelectSnippet(snippet);
    this.setState({snippet, codesandboxResult: null});
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

  _generateAndDownloadZipFile = async (
    operationDataList: Array<OperationData>,
  ) => {
    const snippet = this._activeSnippet();
    if (!snippet) {
      // Shouldn't be able to get in this state, but just in case...
      this.setState({
        codesandboxResult: {type: 'error', error: 'No active snippet'},
      });
      return;
    }
    const generateZipFile = snippet.generateZipFile;
    if (!generateZipFile) {
      // Shouldn't be able to get in this state, but just in case...
      this.setState({
        codesandboxResult: {
          type: 'error',
          error: 'Snippet does not support zip files',
        },
      });
      return;
    }
    try {
      const zip = await generateZipFile(
        this._collectOptions(snippet, operationDataList, this.props.schema),
      );

      window.zip = zip;

      saveAs(zip.blob, zip.name);
    } catch (e) {
      window.eero = e;
      console.error('Error generating zip', e);
      this.setState({
        codesandboxResult: {
          type: 'error',
          error: 'Failed to generate zip file',
        },
      });
    }
  };

  _generateCodesandbox = async (operationDataList: Array<OperationData>) => {
    this.setState({codesandboxResult: {type: 'loading'}});
    const snippet = this._activeSnippet();
    if (!snippet) {
      // Shouldn't be able to get in this state, but just in case...
      this.setState({
        codesandboxResult: {type: 'error', error: 'No active snippet'},
      });
      return;
    }
    const generateFiles = snippet.generateCodesandboxFiles;
    if (!generateFiles) {
      // Shouldn't be able to get in this state, but just in case...
      this.setState({
        codesandboxResult: {
          type: 'error',
          error: 'Snippet does not support CodeSandbox',
        },
      });
      return;
    }
    try {
      const sandboxResult = await createCodesandbox(
        generateFiles(
          this._collectOptions(snippet, operationDataList, this.props.schema),
        ),
      );
      this.setState({
        codesandboxResult: {type: 'success', ...sandboxResult},
      });
      this.props.onGenerateCodesandbox &&
        this.props.onGenerateCodesandbox(sandboxResult);
    } catch (e) {
      console.error('Error generating codesandbox', e);
      this.setState({
        codesandboxResult: {
          type: 'error',
          error: 'Failed to generate CodeSandbox',
        },
      });
    }
  };

  _collectOptions = (
    snippet: Snippet,
    operationDataList: Array<OperationData>,
    schema: ?GraphQLSchema,
  ): GenerateOptions => {
    const {serverUrl, context = {}, headers = {}} = this.props;
    const optionValues = this.getOptionValues(snippet);
    return {
      serverUrl,
      headers,
      context,
      operationDataList,
      options: optionValues,
      schema,
    };
  };

  render() {
    const {query, snippets, variables = {}} = this.props;
    const {showCopiedTooltip, codesandboxResult} = this.state;

    const snippet = this._activeSnippet();
    const operationDefinitions = getOperationNodes(query);

    const {name, language, generate} = snippet;

    const fragmentDefinitions: Array<FragmentDefinitionNode> = [];

    for (const operationDefinition of operationDefinitions) {
      if (operationDefinition.kind === 'FragmentDefinition') {
        fragmentDefinitions.push(operationDefinition);
      }
    }

    const rawOperationDataList: Array<OperationData> = operationDefinitions.map(
      (
        operationDefinition: OperationDefinitionNode | FragmentDefinitionNode,
      ) => ({
        query: print(operationDefinition),
        name: getOperationName(operationDefinition),
        displayName: getOperationDisplayName(operationDefinition),
        // $FlowFixMe: Come back for this
        type: operationDefinition.operation || 'fragment',
        variableName: formatVariableName(getOperationName(operationDefinition)),
        variables: getUsedVariables(variables, operationDefinition),
        operationDefinition,
        fragmentDependencies: findFragmentDependencies(
          fragmentDefinitions,
          operationDefinition,
        ),
      }),
    );

    const operationDataList = toposort(rawOperationDataList);

    const optionValues: Array<OperationData> = this.getOptionValues(snippet);

    const codeSnippet = operationDefinitions.length
      ? generate(
          this._collectOptions(snippet, operationDataList, this.props.schema),
        )
      : null;

    const supportsCodesandbox = snippet.generateCodesandboxFiles;

    const supportsZipDownload = snippet.generateZipFile;

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
                <li key={lang} onClick={() => this.setLanguage(lang)}>
                  {lang}
                </li>
              ))}
            </ToolbarMenu>
            <ToolbarMenu label={name} title="Mode">
              {snippets
                .filter(snippet => snippet.language === language)
                .map(snippet => (
                  <li
                    key={snippet.name}
                    onClick={() => this.setSnippet(snippet)}>
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
                    // $FlowFixMe: Come back for this
                    checked={optionValues[option.id]}
                    onChange={() =>
                      this.handleSetOptionValue(
                        snippet,
                        option.id,
                        // $FlowFixMe: Come back for this
                        !optionValues[option.id],
                      )
                    }
                  />
                  <label htmlFor={option.id} style={{paddingLeft: 5}}>
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div style={{minHeight: 8}} />
          )}
          {supportsCodesandbox ? (
            <div style={{padding: '0 7px 8px'}}>
              <button
                className={'toolbar-button'}
                style={{
                  backgroundColor: 'white',
                  border: 'none',
                  outline: 'none',
                  maxWidth: 320,
                  display: 'flex',
                  ...(codeSnippet
                    ? {}
                    : {
                        opacity: 0.6,
                        cursor: 'default',
                        background: '#ececec',
                      }),
                }}
                type="button"
                disabled={!codeSnippet}
                onClick={() => this._generateCodesandbox(operationDataList)}>
                {codesandboxIcon}{' '}
                <span style={{paddingLeft: '0.5em'}}>Create CodeSandbox</span>
              </button>
              {codesandboxResult ? (
                <div style={{paddingLeft: 5, paddingTop: 5}}>
                  {codesandboxResult.type === 'loading' ? (
                    'Loading...'
                  ) : codesandboxResult.type === 'error' ? (
                    `Error: ${codesandboxResult.error}`
                  ) : (
                    <a
                      rel="noopener noreferrer"
                      target="_blank"
                      href={`https://codesandbox.io/s/${codesandboxResult.sandboxId}`}>
                      Visit CodeSandbox
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          {supportsZipDownload ? (
            <div style={{padding: '0 7px 8px'}}>
              <button
                className={'toolbar-button'}
                style={{
                  backgroundColor: 'white',
                  border: 'none',
                  outline: 'none',
                  maxWidth: 320,
                  display: 'flex',
                  ...(codeSnippet
                    ? {}
                    : {
                        opacity: 0.6,
                        cursor: 'default',
                        background: '#ececec',
                      }),
                }}
                type="button"
                disabled={!codeSnippet}
                onClick={() =>
                  this._generateAndDownloadZipFile(operationDataList)
                }>
                {zipFileIcon}{' '}
                <span style={{paddingLeft: '0.5em'}}>Download</span>
              </button>
            </div>
          ) : null}
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
              The generated code will appear here once the errors in the query
              editor are resolved.
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
  onGenerateCodesandbox?: ?({sandboxId: string}) => void,
  schema: ?GraphQLSchema,
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
  onGenerateCodesandbox,
  schema,
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
      className="docExplorerWrap"
      style={{
        width: 440,
        minWidth: 440,
        zIndex: 7,
      }}>
      <div className="doc-explorer-title-bar">
        <div className="doc-explorer-title">Code Exporter</div>
        <div className="doc-explorer-rhs">
          <div className="docExplorerHide" onClick={hideCodeExporter}>
            {'\u2715'}
          </div>
        </div>
      </div>
      <div
        className="doc-explorer-contents"
        style={{borderTop: '1px solid #d6d6d6', padding: 0}}>
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
              onGenerateCodesandbox={onGenerateCodesandbox}
              schema={schema}
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
