// @flow
import React, {Component} from 'react';
import copy from 'copy-to-clipboard';
import {
  BREAK,
  getNamedType,
  GraphQLInputObjectType,
  GraphQLObjectType,
  parse,
  print,
  visit,
  visitWithTypeInfo,
  TypeInfo,
} from 'graphql';
// $FlowFixMe: can't find module
import CodeMirror from 'codemirror';
import toposort from './toposort.js';
import Modal from './Modal';

import * as OG from './OneGraphOperations';

import type {
  GraphQLSchema,
  FieldNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  VariableDefinitionNode,
  VariableNode,
  NameNode,
  OperationTypeNode,
  SelectionSetNode,
} from 'graphql';

import './CodeExporter.css';

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

// eslint-disable-next-line
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

// eslint-disable-next-line
const gitHubIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg">
    <title>{'GitHub icon'}</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const downArrow = props => (
  <svg width="14" height="8" {...props}>
    <path fill="#666" d="M 5 1.5 L 14 1.5 L 9.5 7 z"></path>
  </svg>
);

const gitPushIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 800 800">
    <path d="M128 64C57.344 64 0 121.344 0 192c0 47.219 25.906 88.062 64 110.281V721.75C25.906 743.938 0 784.75 0 832c0 70.625 57.344 128 128 128s128-57.375 128-128c0-47.25-25.844-88.062-64-110.25V302.281c38.156-22.219 64-63.062 64-110.281 0-70.656-57.344-128-128-128zm0 832c-35.312 0-64-28.625-64-64 0-35.312 28.688-64 64-64 35.406 0 64 28.688 64 64 0 35.375-28.594 64-64 64zm0-640c-35.312 0-64-28.594-64-64s28.688-64 64-64c35.406 0 64 28.594 64 64s-28.594 64-64 64zm576 465.75V320c0-192.5-192-192-192-192h-64V0L256 192l192 192V256h64c56.438 0 64 64 64 64v401.75c-38.125 22.188-64 62.938-64 110.25 0 70.625 57.375 128 128 128s128-57.375 128-128c0-47.25-25.875-88.062-64-110.25zM640 896c-35.312 0-64-28.625-64-64 0-35.312 28.688-64 64-64 35.375 0 64 28.688 64 64 0 35.375-28.625 64-64 64z"></path>
  </svg>
);

const gitNewRepoIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 1024 1024">
    <path d="M512 320H384v128H256v128h128v128h128V576h128V448H512V320zM832 64H64C0 64 0 128 0 128v768s0 64 64 64h768c64 0 64-64 64-64V128s0-64-64-64zm-64 736c0 32-32 32-32 32H160s-32 0-32-32V224c0-32 32-32 32-32h576s32 0 32 32v576z"></path>
  </svg>
);

type ShallowFragmentVariables = {
  [string]: {
    variables: ?Array<{name: string, type: string}>,
  },
};
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
  schema: ?GraphQLSchema,
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
};

type NamedPath = Array<string>;

const snippetStorageName = snippet => {
  return `${snippet.language}:${snippet.name}`;
};

export const namedPathOfAncestors = (
  ancestors: ?$ReadOnlyArray<Array<any>>,
): namedPath =>
  (ancestors || []).reduce((acc, next) => {
    if (Array.isArray(next)) {
      return acc;
    }
    switch (next.kind) {
      case 'Field':
        return [...acc, next.name.value];
      case 'InlineFragment':
        return [...acc, `$inlineFragment.${next.typeCondition.name.value}`];
      case 'Argument':
        return [...acc, `$arg.${next.name.value}`];
      default:
        return acc;
    }
  }, []);

const findVariableTypeFromAncestorPath = (
  schema: GraphQLSchema,
  definitionNode: FragmentDefinitionNode,
  variable: VariableNode,
  ancestors: ?$ReadOnlyArray<Array<any>>,
): ?{name: string, type: any} => {
  const namePath = namedPathOfAncestors(ancestors);

  // $FlowFixMe: Optional chaining
  const usageAst = ancestors.slice(-1)?.[0]?.find(argAst => {
    return argAst.value?.name?.value === variable.name.value;
  });

  if (!usageAst) {
    return;
  }

  const argObjectValueHelper = (
    inputObj: GraphQLInputObjectType,
    path: Array<string>,
    parentField: ?any,
  ): ?{name: string, type: any} => {
    if (path.length === 0) {
      const finalInputField = inputObj.getFields()[usageAst.name.value];
      return {
        name: variable.name.value,
        type: finalInputField.type,
      };
    }

    const [next, ...rest] = path;
    const field = inputObj.getFields()[next];
    const namedType = getNamedType(field.type);
    if (!!namedType && namedType instanceof GraphQLInputObjectType) {
      return argObjectValueHelper(namedType, rest, field);
    }
  };

  const argByName = (field, name) =>
    field && field.args.find(arg => arg.name === name);

  const helper = (
    obj: GraphQLObjectType,
    path: Array<string>,
    parentField: ?any,
  ): ?{name: string, type: any} => {
    if ((path || []).length === 0) {
      const arg = argByName(parentField, usageAst.name.value);
      if (!!arg) {
        return {name: variable.name.value, type: arg.type};
      }
    }

    window.getNamedType = getNamedType;

    const [next, ...rest] = path;
    if (!next) {
      console.warn(
        'Next is null before finding target (this may be normal) ',
        variable,
        namePath,
        definitionNode,
      );
      return;
    }
    const nextIsArg = next.startsWith('$arg.');
    const nextIsInlineFragment = next.startsWith('$inlineFragment.');

    if (nextIsArg) {
      const argName = next.replace('$arg.', '');
      const arg = argByName(parentField, argName);
      if (!arg) {
        console.warn('Failed to find arg: ', argName);
        return;
      }
      const inputObj = getNamedType(arg.type);

      if (!!inputObj) {
        return argObjectValueHelper(inputObj, rest);
      }
    } else if (nextIsInlineFragment) {
      const typeName = next.replace('$inlineFragment.', '');
      const type = schema.getType(typeName);
      const namedType = type && getNamedType(type);
      const field = namedType.getFields()[next];

      return helper(namedType, rest, field);
    } else {
      const field = obj.getFields()[next];
      const namedType = getNamedType(field.type);

      // TODO: Clean up this mess
      if ((rest || []).length === 0) {
        // Dummy use of `obj` since I botched the recursion base case
        return helper(obj, rest, field);
      } else {
        if (!!namedType && !!namedType.getFields) {
          // $FlowFixMe: Not sure how to type a "GraphQL object that has getFields"
          return helper(namedType, rest, field);
        }
      }
    }
  };

  const isDefinitionNode = [
    'OperationDefinition',
    'FragmentDefinition',
  ].includes(definitionNode.kind);

  if (!isDefinitionNode) {
    return;
  }

  const rootType =
    definitionNode.kind === 'FragmentDefinition'
      ? schema.getType(definitionNode.typeCondition.name.value)
      : null;

  if (!!rootType && !!rootType.getFields) {
    // $FlowFixMe: Not sure how to type a "GraphQL object that has getFields"
    return helper(rootType, namePath);
  }
};

export const computeOperationDataList = ({
  query,
  variables,
  schema,
}: {
  query: string,
  variables: Variables,
  schema: ?GraphQLSchema,
}) => {
  const operationDefinitions = getOperationNodes(query);

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
        schema,
        fragmentDefinitions,
        operationDefinition,
      ),
      paginationSites:
        schema && findPaginationSites(schema, operationDefinition),
    }),
  );

  const operationDataList = toposort(rawOperationDataList);

  let fragmentVariables;
  if (!!schema) {
    const shallowFragmentVariables = collectFragmentVariables(
      schema,
      fragmentDefinitions,
    );

    fragmentVariables = computeDeepFragmentVariables(
      schema,
      operationDataList,
      shallowFragmentVariables,
    );
  }

  const result = {
    operationDefinitions: operationDefinitions,
    fragmentDefinitions: fragmentDefinitions,
    rawOperationDataList: rawOperationDataList,
    operationDataList: operationDataList,
    fragmentVariables: fragmentVariables,
  };

  return result;
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

const findPaginationSites = (
  schema: GraphQLSchema,
  operationDefinition: OperationDefinitionNode | FragmentDefinitionNode,
) => {
  var typeInfo = new TypeInfo(schema);
  var paginationSites = [];
  let previousNode;

  const hasArgByNameAndTypeName = (field, argName, typeName) => {
    return field.args.some(
      arg => arg.name === argName && arg.type.name === typeName,
    );
  };

  visit(
    operationDefinition,
    visitWithTypeInfo(typeInfo, {
      Field: {
        enter: (node, key, parent, path, ancestors) => {
          const namedType = getNamedType(typeInfo.getType());
          const typeName = namedType?.name;
          const parentType = typeInfo.getParentType();
          const parentNamedType = parentType && getNamedType(parentType);
          const parentTypeName = parentNamedType?.name;

          const isConnectionCandidate =
            !!parentTypeName?.endsWith('Connection') &&
            !!typeName.endsWith('Edge') &&
            !!previousNode;

          if (typeName.endsWith('Connection')) {
            previousNode = {
              node,
              namedType: getNamedType(typeInfo.getType()),
              parent: parentNamedType,
              field: parentNamedType?.getFields()?.[node.name.value],
            };
          } else if (isConnectionCandidate) {
            const parentField = previousNode?.field;
            const parentHasConnectionArgs =
              hasArgByNameAndTypeName(parentField, 'first', 'Int') &&
              hasArgByNameAndTypeName(parentField, 'after', 'String');

            const hasConnectionSelection =
              node.name?.value === 'edges' &&
              node.selectionSet?.selections?.some(
                sel => sel.name?.value === 'node',
              );

            const hasPageInfoType = !!getNamedType(
              parentNamedType?.getFields()?.['pageInfo']?.type,
            )?.name?.endsWith('PageInfo');

            const conformsToConnectionSpec =
              parentHasConnectionArgs &&
              hasConnectionSelection &&
              hasPageInfoType;

            if (conformsToConnectionSpec) {
              paginationSites.push([node, [...ancestors]]);
            }

            previousNode = null;
          } else {
            previousNode = null;
          }
        },
      },
    }),
  );

  return paginationSites;
};

const baseFragmentDefinition = {
  kind: 'FragmentDefinition',
  typeCondition: {
    kind: 'NamedType',
    name: {
      kind: 'Name',
      value: 'TypeName',
    },
  },
  selectionSet: {
    kind: 'SelectionSet',
    selections: [],
  },
  name: {
    kind: 'Name',
    value: 'PlaceholderFragment',
  },
  directives: [],
};

export const extractNodeToConnectionFragment = ({
  schema,
  node,
  moduleName,
  propName,
  typeConditionName,
}: {
  schema: GraphQLSchema,
  node: FieldNode,
  moduleName: string,
  propName: string,
  typeConditionName: string,
}) => {
  const fragmentName = `${moduleName}_${propName}`;

  const canonicalArgumentNameMapping = {
    first: 'count',
    after: 'cursor',
    last: 'last',
    before: 'cursor',
  };
  const connectionFirstArgument = {
    kind: 'Argument',
    name: {
      kind: 'Name',
      value: 'first',
    },
    value: {
      kind: 'Variable',
      name: {
        kind: 'Name',
        value: 'count',
      },
    },
  };

  const connectionAfterArgument = {
    kind: 'Argument',
    name: {
      kind: 'Name',
      value: 'after',
    },
    value: {
      kind: 'Variable',
      name: {
        kind: 'Name',
        value: 'cursor',
      },
    },
  };

  const hasFirstArgument = (node.arguments || []).some(
    arg => arg.name.value === 'first',
  );
  const hasAfterArgument = (node.arguments || []).some(
    arg => arg.name.value === 'after',
  );

  const namedType = schema.getType(typeConditionName);

  const namedTypeHasId = !!(namedType && namedType.getFields().id);

  const args = node?.arguments?.map(arg => {
    const variableName = canonicalArgumentNameMapping[arg.name.value];

    return !!variableName
      ? {
          ...arg,
          value: {
            ...arg.value,
            kind: 'Variable',
            name: {kind: 'Name', value: variableName},
          },
        }
      : arg;
  });

  if (!hasFirstArgument) {
    args.push(connectionFirstArgument);
  }

  if (!hasAfterArgument) {
    args.push(connectionAfterArgument);
  }

  const connectionKeyName = `${fragmentName}_${(node.alias &&
    node.alias.value) ||
    node.name.value}`;

  const tempFragmentDefinition = {
    ...baseFragmentDefinition,
    name: {...baseFragmentDefinition.name, value: fragmentName},
    typeCondition: {
      ...baseFragmentDefinition.typeCondition,
      name: {
        ...baseFragmentDefinition.typeCondition.name,
        value: typeConditionName,
      },
    },
    directives: [],
    selectionSet: {
      ...baseFragmentDefinition.selectionSet,
      selections: [
        // Add id field automatically for store-based connections like Relay
        ...(namedTypeHasId
          ? [
              {
                kind: 'Field',
                name: {
                  kind: 'Name',
                  value: 'id',
                },
                directives: [],
              },
            ]
          : []),
        {
          ...node,
          directives: [
            {
              kind: 'Directive',
              name: {
                kind: 'Name',
                value: 'connection',
              },
              arguments: [
                {
                  kind: 'Argument',
                  name: {kind: 'Name', value: 'key'},
                  value: {
                    kind: 'StringValue',
                    value: connectionKeyName,
                    block: false,
                  },
                },
              ],
            },
          ],
          arguments: [...(args || [])],
        },
      ],
    },
  };

  const allFragmentVariables = findFragmentVariables(
    schema,
    tempFragmentDefinition,
  );

  const fragmentVariables =
    allFragmentVariables[tempFragmentDefinition.name.value] || [];

  const usedArgumentDefinition = fragmentVariables
    .filter(Boolean)
    .map(({name, type}) => {
      if (!['count', 'first', 'after', 'cursor'].includes(name)) {
        return {name: name, type: type.toString()};
      }

      return null;
    })
    .filter(Boolean);

  const hasCountArgumentDefinition = usedArgumentDefinition.some(
    argDef => argDef.name === 'count',
  );
  const hasCursorArgumentDefinition = usedArgumentDefinition.some(
    argDef => argDef.name === 'cursor',
  );

  const baseArgumentDefinitions = [
    hasCountArgumentDefinition
      ? null
      : {
          name: 'count',
          type: 'Int',
          defaultValue: {kind: 'IntValue', value: '10'},
        },
    hasCursorArgumentDefinition ? null : {name: 'cursor', type: 'String'},
  ].filter(Boolean);

  const argumentDefinitions = makeArgumentsDefinitionsDirective([
    ...baseArgumentDefinitions,
    ...usedArgumentDefinition,
  ]);

  return {...tempFragmentDefinition, directives: [argumentDefinitions]};
};

export const astByNamedPath = (ast, namedPath, customVisitor) => {
  let remaining = [...namedPath];
  let nextName = remaining[0];
  let target;
  let baseVisitor = {
    InlineFragment: (node, key, parent, path, ancestors) => {
      const nextIsInlineFragment = nextName.startsWith('$inlineFragment.');
      if (nextIsInlineFragment) {
        const typeName = nextName.replace('$inlineFragment.', '');
        const isNextTargetNode = node.typeCondition.name.value === typeName;

        if (isNextTargetNode) {
          if (remaining?.length === 1 && isNextTargetNode) {
            target = {node, key, parent, path, ancestors: [...ancestors]};
            return BREAK;
          } else if (isNextTargetNode) {
            remaining = remaining.slice(1);
            nextName = remaining[0];
          }
        }
      }
    },
    Field: (node, key, parent, path, ancestors) => {
      const isNextTargetNode = node.name.value === nextName;
      if (remaining?.length === 1 && isNextTargetNode) {
        target = {node, key, parent, path, ancestors: [...ancestors]};
        return BREAK;
      } else if (isNextTargetNode) {
        remaining = remaining.slice(1);
        nextName = remaining[0];
      }
    },
  };

  let visitor = customVisitor ? customVisitor(baseVisitor) : baseVisitor;

  visit(ast, visitor);
  return target;
};

export const findUnusedOperationVariables = (
  operationDefinition: OperationDefinitionNode,
) => {
  const variableNames = (operationDefinition.variableDefinitions || []).map(
    def => {
      return def.variable.name.value;
    },
  );

  let unusedVariables = new Set(variableNames);

  let baseVisitor = {
    Variable: (node, key, parent, path, ancestors) => {
      if (variableNames.includes(node.name.value)) {
        unusedVariables.delete(node.name.value);
      }
    },
  };

  let visitor = baseVisitor;

  visit(operationDefinition.selectionSet, visitor);
  return unusedVariables;
};

export const pruneOperationToNamedPath = (
  operationDefinition: OperationDefinitionNode,
  namedPath: NamedPath,
): OperationDefinitionNode => {
  let remaining = [...namedPath];
  let nextName = remaining[0];

  const processNode = (node, key, parent, path, ancestors) => {
    const isNextTargetNode = node.name.value === nextName;
    if (remaining?.length === 1 && isNextTargetNode) {
      return false;
    } else if (isNextTargetNode) {
      remaining = remaining.slice(1);
      nextName = remaining[0];
      return;
    } else {
      return null;
    }
  };

  const result = visit(operationDefinition, {
    Field: processNode,
    FragmentSpread: processNode,
  });

  return result;
};

export const updateAstAtPath = (ast, namedPath, updater, customVisitor) => {
  let remaining = [...namedPath];
  let nextName = remaining[0];

  let baseVisitor = {
    Field: (node, key, parent, path, ancestors) => {
      const isNextTargetNode = node.name.value === nextName;
      if ((remaining || []).length === 1 && isNextTargetNode) {
        return updater(node, key, parent, path, ancestors);
      } else if ((remaining || []).length === 0) {
        return false;
      } else if (isNextTargetNode) {
        remaining = remaining.slice(1);
        nextName = remaining[0];
      }
    },
  };

  let visitor = customVisitor ? customVisitor(baseVisitor) : baseVisitor;

  return visit(ast, visitor);
};

export const renameOperation = (
  operationDefinition: OperationDefinitionNode,
  name: string,
): OperationDefinitionNode => {
  const nameNode: NameNode = !!operationDefinition.name?.value
    ? {...operationDefinition.name, value: name}
    : {kind: 'Name', value: name};
  return {...operationDefinition, name: nameNode};
};

export const makeAstDirective = ({
  name,
  args,
}: {
  name: string,
  args: Array<any>,
}) => {
  return {
    kind: 'Directive',
    name: {
      kind: 'Name',
      value: name,
    },
    arguments: args,
  };
};

export const makeArgumentsDefinitionsDirective = (
  defs: Array<{
    name: string,
    type: string,
    defaultValue?: {
      kind: string,
      value: any,
    },
  }>,
) => {
  const astDirective = makeAstDirective({
    name: 'argumentDefinitions',
    args: defs.map(def => {
      const defaultValueField = !!def.defaultValue
        ? [
            {
              kind: 'ObjectField',
              name: {
                kind: 'Name',
                value: 'defaultValue',
              },
              value: {
                kind: def.defaultValue.kind,
                value: def.defaultValue.value,
              },
            },
          ]
        : [];

      return {
        kind: 'Argument',
        name: {
          kind: 'Name',
          value: def.name,
        },
        value: {
          kind: 'ObjectValue',
          fields: [
            {
              kind: 'ObjectField',
              name: {
                kind: 'Name',
                value: 'type',
              },
              value: {
                kind: 'StringValue',
                value: def.type,
                block: false,
              },
            },
            ...defaultValueField,
          ],
        },
      };
    }),
  });

  return astDirective;
};

export const makeArgumentsDirective = (
  defs: Array<{
    argName: string,
    variableName: string,
  }>,
) => {
  return makeAstDirective({
    name: 'arguments',
    args: defs.map(def => {
      return {
        kind: 'Argument',
        name: {
          kind: 'Name',
          value: def.name,
        },
        value: {
          kind: 'Variable',
          name: {
            kind: 'Name',
            value: def.variableName,
          },
        },
      };
    }),
  });
};

export const findFragmentVariables = (
  schema: GraphQLSchema,
  def: FragmentDefinitionNode,
) => {
  if (!schema) {
    return {};
  }

  const typeInfo = new TypeInfo(schema);

  let fragmentVariables = {};

  visit(
    def,
    visitWithTypeInfo(typeInfo, {
      Variable: function(node, key, parent, path, ancestors) {
        const usedVariables = findVariableTypeFromAncestorPath(
          schema,
          def,
          node,
          ancestors,
        );
        const existingVariables = fragmentVariables[def.name.value] || [];
        const alreadyHasVariable =
          // TODO: Don't filter boolean, fix findVariableTypeFromAncestorPath
          existingVariables
            .filter(Boolean)
            .some(existingDef => existingDef.name === def.name.value);
        fragmentVariables[def.name.value] = alreadyHasVariable
          ? existingVariables
          : [...existingVariables, usedVariables];
      },
    }),
  );

  return fragmentVariables;
};

let findFragmentDependencies = (
  schema: ?GraphQLSchema,
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
          const fragmentDef = fragmentByName(selection.name.value);

          return fragmentDef;
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

let collectFragmentVariables = (
  schema: ?GraphQLSchema,
  operationDefinitions: Array<FragmentDefinitionNode>,
): ShallowFragmentVariables => {
  const entries = operationDefinitions
    .map(fragmentDefinition => {
      let usedVariables = {};

      if (!!schema && fragmentDefinition.kind === 'FragmentDefinition') {
        usedVariables = findFragmentVariables(schema, fragmentDefinition);
      }

      return usedVariables;
    })
    .reduce((acc, next) => Object.assign(acc, next), {});

  return entries;
};

const computeDeepFragmentVariables = (
  schema: GraphQLSchema,
  operationDataList: Array<OperationData>,
  shallowFragmentVariables: ShallowFragmentVariables,
) => {
  const fragmentByName = (name: string) => {
    return operationDataList.find(
      operationData => operationData.operationDefinition.name?.value === name,
    );
  };

  const entries = operationDataList
    .map(operationData => {
      const operation = operationData.operationDefinition;
      if (operation.kind === 'FragmentDefinition' && !!operation.name) {
        const localVariables =
          shallowFragmentVariables[operation.name.value] || [];
        const visitedFragments = new Set();

        const helper = deps => {
          return deps.reduce((acc, dep) => {
            const depName = dep.name.value;
            if (visitedFragments.has(depName)) {
              return acc;
            } else {
              visitedFragments.add(depName);
              const depLocalVariables = shallowFragmentVariables[depName] || [];
              const subDep = fragmentByName(depName);
              if (subDep) {
                const subDeps = helper(subDep.fragmentDependencies);
                return {...acc, [depName]: depLocalVariables, ...subDeps};
              } else {
                return {...acc, [depName]: depLocalVariables};
              }
            }
          }, []);
        };

        let deepFragmentVariables = helper(operationData.fragmentDependencies);

        return [
          operation.name.value,
          {
            shallow: localVariables,
            deep: {
              [operation.name.value]: localVariables,
              ...deepFragmentVariables,
            },
          },
        ];
      } else {
        return null;
      }
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
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

type GitHubRepositoryIdentifier = {|
  owner: string,
  name: string,
  branch: string,
|};

const descriptionOfGitHubRepositoryIdentifier = (
  repoIdentifier: GitHubRepositoryIdentifier,
): string => {
  return `${repoIdentifier.owner}/${repoIdentifier.name}:"${repoIdentifier.branch}"`;
};
type GitHubInfo = {|
  login: ?string,
  targetRepo: ?GitHubRepositoryIdentifier,
  availableRepositories: ?Array<GitHubRepositoryIdentifier>,
  repoSearch: ?string,
  searchOpen: boolean,
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
  gitHubPushResult:
    | null
    | {type: 'loading'}
    | {type: 'success'}
    | {type: 'error', error: string},
  gitHubInfo: ?GitHubInfo,
  forceOverwriteFiles: {[string]: boolean},
|};

class CodeExporter extends Component<Props, State> {
  style: ?HTMLLinkElement;
  state = {
    showCopiedTooltip: false,
    optionValuesBySnippet: new Map(),
    snippet: null,
    codesandboxResult: null,
    gitHubPushResult: null,
    gitHubInfo: {searchOpen: false},
    snippetStorage: null,
  };

  _activeSnippet = (): Snippet =>
    this.props.snippet || this.state.snippet || this.props.snippets[0];

  setSnippet = (snippet: Snippet) => {
    this.props.onSelectSnippet && this.props.onSelectSnippet(snippet);

    const snippetStorage = JSON.parse(
      localStorage.getItem(snippetStorageName(snippet)) || '{}',
    );

    this.setState({snippet, snippetStorage, codesandboxResult: null});
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

  _generateFiles = async (
    operationDataList: Array<OperationData>,
    fragmentVariables,
  ) => {
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
      const {query, variables = {}} = this.props;

      const {fragmentVariables, operationDataList} = computeOperationDataList({
        query,
        variables,
        schema: this.props.schema,
      });

      const generateOptions = this._collectOptions(
        snippet,
        operationDataList,
        this.props.schema,
        fragmentVariables,
      );

      const files = generateFiles(generateOptions);

      return files;
    } catch (e) {
      console.error('Error generating files', e);
    }
  };

  _generateCodesandbox = async (
    operationDataList: Array<OperationData>,
    fragmentVariables,
  ) => {
    this.setState({codesandboxResult: {type: 'loading'}});

    try {
      const files = this._generateFiles(operationDataList, fragmentVariables);

      if (!files) {
        console.warn('No files generated');
        return;
      }

      const sandboxResult = await createCodesandbox(files);
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

  _pushChangesToGitHub = async (
    operationDataList: Array<OperationData>,
    fragmentVariables,
    fileOverwriteList: {[string]: boolean},
  ) => {
    this.setState({gitHubPushResult: {type: 'loading'}});

    const targetRepo = this.state.gitHubInfo?.targetRepo;

    if (!targetRepo) {
      this.setState({
        gitHubPushResult: {
          type: 'error',
          error: 'You must select a target GitHub repository to sync with',
        },
      });

      return;
    }

    try {
      const files = await this._generateFiles(
        operationDataList,
        fragmentVariables,
      );

      if (!files) {
        console.warn('No files generated');
        return;
      }

      const transformedFiles = Object.entries(files)
        .filter(([path, details]) => {
          return typeof fileOverwriteList[path] === 'undefined'
            ? true
            : fileOverwriteList[path];
        })
        .map(([path, details]) => {
          const fileContent =
            typeof details.content === 'object'
              ? JSON.stringify(details.content, null, 2)
              : details.content;
          return {
            path: path,
            mode: '100644',
            content: fileContent,
          };
        });

      const acceptOverrides = Object.entries(fileOverwriteList).length > 0;

      const pushResults = await OG.pushFilesToBranch({
        owner: targetRepo.owner,
        name: targetRepo.name,
        branch: targetRepo.branch,
        message: 'Updates from OneGraph code generator',
        treeFiles: transformedFiles,
        acceptOverrides,
      });

      if (!!pushResults) {
        if (typeof pushResults.error === 'string') {
          this.setState({
            gitHubPushResult: {
              type: 'error',
              error: pushResults.error,
            },
          });
        } else if (!!pushResults.confirmationNeeded) {
          this.setState(oldState => {
            return {
              gitHubPushResult: {
                type: 'error',
                error: 'Confirm file overwrite',
              },
              gitHubConfirmationModal: {
                changeset: pushResults.changeset,
              },
            };
          });
        } else if (!!pushResults.ok) {
          this.setState({
            gitHubPushResult: {
              type: 'success',
            },
          });
          setTimeout(() => {
            this.setState({
              gitHubPushResult: null,
            });
          }, 2500);
        }
      }
    } catch (e) {
      console.error('Error in GitHub synch', e);
      this.setState({
        gitHubPushResult: {
          type: 'error',
          error: 'Failed to sync with GitHub',
        },
      });
    }
  };

  _collectOptions = (
    snippet: Snippet,
    operationDataList: Array<OperationData>,
    schema: ?GraphQLSchema,
    fragmentVariables,
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
      fragmentVariables,
    };
  };

  setOverwritePath({path, overwrite}: {path: string, overwrite: boolean}) {
    const newSnippetStorage = {
      ...this.state.snippetStorage,
      overwriteSettings: {
        ...(this.state.snippetStorage?.overwriteSettings || {}),
        [path]: overwrite,
      },
    };
    localStorage.setItem(
      snippetStorageName(this._activeSnippet()),
      JSON.stringify(newSnippetStorage),
    );
    this.setState({snippetStorage: newSnippetStorage});
  }

  setTargetRepo(owner: string, name: string, branch: string) {
    const newSnippetStorage = {
      ...this.state.snippetStorage,
      targetRepo: {
        owner: owner,
        name: name,
        branch: branch,
      },
    };

    localStorage.setItem(
      snippetStorageName(this._activeSnippet()),
      JSON.stringify(newSnippetStorage),
    );

    this.setState(oldState => {
      return {
        ...oldState,
        gitHubInfo: {
          ...oldState.gitHubInfo,
          searchOpen: false,
          targetRepo: {
            owner: owner,
            name: name,
            branch: branch,
          },
        },
      };
    });
  }

  componentDidMount() {
    const snippetStorage = JSON.parse(
      localStorage.getItem(snippetStorageName(this._activeSnippet())) || '{}',
    );

    this.setState({snippetStorage: snippetStorage});

    OG.fetchFindMeOnGitHub().then(result => {
      const rawGitHubInfo = result.data?.me?.github;
      if (!!rawGitHubInfo) {
        window.rawGitHubInfo = rawGitHubInfo;
        const availableRepositories = rawGitHubInfo.repositories.edges.map(
          edge => {
            const [owner, name] = edge.node.nameWithOwner.split('/');
            return {
              owner: owner,
              name: name,
              branch: 'main',
            };
          },
        );

        const defaultRepo = snippetStorage?.targetRepo;

        const gitHubInfo = {
          login: rawGitHubInfo.login,
          availableRepositories: availableRepositories,
          targetRepo: defaultRepo || availableRepositories[0],
        };

        this.setState(oldState => ({
          ...oldState,
          gitHubInfo: {...oldState.gitHubInfo, ...gitHubInfo},
        }));
      }
    });
  }

  render() {
    const {query, snippets, variables = {}} = this.props;
    const {showCopiedTooltip, codesandboxResult, gitHubPushResult} = this.state;

    const snippet = this._activeSnippet();
    const {name, language, generate} = snippet;

    const gitHubSearchOpen = this.state.gitHubInfo?.searchOpen;

    const {
      fragmentVariables,
      operationDefinitions,
      operationDataList,
    } = computeOperationDataList({
      query,
      variables,
      schema: this.props.schema,
    });

    const optionValues: Array<OperationData> = this.getOptionValues(snippet);
    const codeSnippet = operationDefinitions.length
      ? generate(
          this._collectOptions(
            snippet,
            operationDataList,
            this.props.schema,
            fragmentVariables,
          ),
        )
      : null;

    const supportsCodesandbox = snippet.generateCodesandboxFiles;

    const languages = [
      ...new Set(snippets.map(snippet => snippet.language)),
    ].sort((a, b) => a.localeCompare(b));

    return (
      <div className="graphiql-code-exporter" style={{minWidth: 910}}>
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
              <div style={{display: 'inline-blick'}}>
                {!!this.state.gitHubInfo ? (
                  <ToolbarMenu
                    label={`Sync ${
                      this.state.gitHubInfo?.targetRepo
                        ? descriptionOfGitHubRepositoryIdentifier(
                            this.state.gitHubInfo.targetRepo,
                          )
                        : null
                    }`}
                    title="GitHub Repository and Branch">
                    <li
                      onClick={() => {
                        this._pushChangesToGitHub(
                          operationDataList,
                          fragmentVariables,
                          {},
                        );
                      }}>
                      {gitPushIcon} Push changes
                    </li>
                    <li
                      onClick={async () => {
                        const repoName = prompt(
                          'Name of new GitHub repository',
                        );
                        if (!repoName.trim()) {
                          return;
                        }

                        const result = await OG.executeCreateRepo(repoName);
                        const repo =
                          result?.data?.gitHub?.makeRestCall?.post?.jsonBody;

                        if (!repo) {
                          this.setState({
                            gitHubPushResult: {
                              type: 'error',
                              error: 'Failed to create GitHub repository',
                            },
                          });
                          return;
                        }

                        const defaultRepo = {
                          name: repo?.name,
                          owner: repo?.owner?.login,
                          branch: 'main',
                        };

                        this.setState(oldState => ({
                          ...oldState,
                          gitHubInfo: {
                            ...oldState.gitHubInfo,
                            searchOpen: false,
                            targetRepo: defaultRepo,
                          },
                        }));
                      }}>
                      {gitNewRepoIcon} New repository
                    </li>
                    <li
                      style={
                        gitHubSearchOpen
                          ? {
                              borderBottom: '1px solid #aaa',
                              marginBottom: '2px',
                            }
                          : null
                      }
                      onClick={event => {
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                        this.setState(oldState => {
                          return {
                            ...oldState,
                            gitHubInfo: {
                              ...oldState.gitHubInfo,
                              searchOpen: !gitHubSearchOpen,
                            },
                          };
                        });
                      }}
                      onMouseDown={event => {
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                        return false;
                      }}>
                      Change repository{' '}
                      {downArrow(
                        gitHubSearchOpen
                          ? null
                          : {style: {transform: 'rotate(-90deg)'}},
                      )}
                    </li>
                    {gitHubSearchOpen ? (
                      <li style={{paddingTop: '2px'}}>
                        <input
                          placeholder="Search"
                          style={{
                            border: 'none',
                            width: '100%',
                            borderRadius: '64px',
                            margin: '2px',
                            paddingLeft: '6px',
                          }}
                          onClick={event => {
                            event.stopPropagation();
                            event.nativeEvent.stopImmediatePropagation();
                          }}
                          onMouseDown={event => {
                            event.stopPropagation();
                            event.nativeEvent.stopImmediatePropagation();
                            return false;
                          }}
                          onChange={event => {
                            const value = event.target.value;
                            let repoSearch = value;
                            if (value.trim() === '') {
                              repoSearch = null;
                            }

                            this.setState(oldState => {
                              return {
                                ...oldState,
                                gitHubInfo: {
                                  ...oldState.gitHubInfo,
                                  repoSearch,
                                },
                              };
                            });
                          }}
                          type="text"
                        />
                      </li>
                    ) : null}
                    {gitHubSearchOpen
                      ? (this.state.gitHubInfo?.availableRepositories || [])
                          .map((repoInfo: GitHubRepositoryIdentifier) => {
                            const nameWithOwner = `${repoInfo.owner}/${repoInfo.name}`;

                            if (
                              this.state.gitHubInfo?.repoSearch &&
                              !nameWithOwner.match(
                                this.state.gitHubInfo?.repoSearch,
                              )
                            ) {
                              return null;
                            }

                            return (
                              <li
                                key={nameWithOwner}
                                onClick={() => {
                                  const branchName = prompt(
                                    'Which branch should we push to?',
                                  );

                                  if (!branchName.trim()) {
                                    return;
                                  }

                                  this.setTargetRepo(
                                    repoInfo.owner,
                                    repoInfo.name,
                                    branchName,
                                  );
                                }}>
                                {nameWithOwner}
                              </li>
                            );
                          })
                          .filter(Boolean)
                      : null}
                  </ToolbarMenu>
                ) : null}
              </div>
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
              {gitHubPushResult ? (
                <div style={{paddingLeft: 5, paddingTop: 5}}>
                  {gitHubPushResult.type === 'loading' ? (
                    'Loading...'
                  ) : gitHubPushResult.type === 'error' ? (
                    `Error: ${gitHubPushResult.error}`
                  ) : (
                    <a
                      href={`https://github.com/${this.state.gitHubInfo?.targetRepo?.owner}/${this.state.gitHubInfo?.targetRepo?.name}`}
                      target="_blank"
                      rel="noopener noreferrer">
                      Files synchronized
                    </a>
                  )}
                </div>
              ) : null}
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
        {!!this.state.gitHubConfirmationModal ? (
          <Modal show={!!this.state.gitHubConfirmationModal}>
            <div class="flex-wrapper">
              <header class="header">
                <h1>File change summary</h1>
              </header>
              <section class="content">
                <div class="columns">
                  <main class="changed">
                    <h4>
                      These files have changed in{' '}
                      <code>
                        {this.state.gitHubInfo.targetRepo.owner}/
                        {this.state.gitHubInfo.targetRepo.name}
                      </code>{' '}
                      on the{' '}
                      <code>{this.state.gitHubInfo.targetRepo.branch}</code>{' '}
                      branch and will be overwritten
                    </h4>
                    <ul>
                      {(
                        this.state.gitHubConfirmationModal?.changeset
                          ?.changed || []
                      ).map(file => {
                        const checked =
                          this.state.snippetStorage?.overwriteSettings?.[
                            file.path
                          ] ?? true;

                        return (
                          <li>
                            <input
                              type="checkbox"
                              id={file.path}
                              key={file.path}
                              checked={checked}
                              onChange={event => {
                                this.setOverwritePath({
                                  path: file.path,
                                  overwrite: !checked,
                                });
                              }}
                            />{' '}
                            <label for={file.path}>
                              {' '}
                              <code>{file.path}</code>
                            </label>{' '}
                            - {checked ? 'overwrite' : 'skip'}
                          </li>
                        );
                      })}
                    </ul>
                  </main>
                  {(this.state.gitHubConfirmationModal?.changeset.new || [])
                    .length > 0 ? (
                    <aside class="sidebar-new">
                      <h4>New files</h4>
                      <ul>
                        {(
                          this.state.gitHubConfirmationModal?.changeset?.new ||
                          []
                        ).map(file => {
                          return (
                            <li style={{color: 'green'}}>
                              <code>{file.path}</code>
                            </li>
                          );
                        })}
                      </ul>
                    </aside>
                  ) : null}{' '}
                  {(
                    this.state.gitHubConfirmationModal?.changeset.unchanged ||
                    []
                  ).length > 0 ? (
                    <aside class="sidebar-unchanged">
                      <h4> Unchanged files</h4>
                      <ul>
                        {(
                          this.state.gitHubConfirmationModal?.changeset
                            ?.unchanged || []
                        ).map(file => {
                          return (
                            <li style={{color: 'gray'}}>
                              <code>{file.path}</code>
                            </li>
                          );
                        })}
                      </ul>
                    </aside>
                  ) : null}
                </div>
              </section>
              <footer>
                <button
                  onClick={() => {
                    this.setState({
                      gitHubConfirmationModal: null,
                      gitHubPushResult: null,
                    });
                    this._pushChangesToGitHub(
                      operationDataList,
                      fragmentVariables,
                      this.state.snippetStorage?.overwriteSettings,
                    );
                  }}>
                  Confirm
                </button>
                <button
                  onClick={() => {
                    this.setState({
                      gitHubConfirmationModal: null,
                      gitHubPushResult: null,
                    });
                  }}>
                  Cancel
                </button>
              </footer>
            </div>
          </Modal>
        ) : null}
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
        width: 1440,
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
