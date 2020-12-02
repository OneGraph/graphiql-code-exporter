// @flow

import CodeExporter, {
  computeOperationDataList,
  astByNamedPath,
  extractNodeToConnectionFragment,
  namedPathOfAncestors,
  pruneOperationToNamedPath,
  renameOperation,
  makeAstDirective,
  makeArgumentsDefinitionsDirective,
  makeArgumentsDirective,
  updateAstAtPath,
  findUnusedOperationVariables,
  findFragmentVariables,
} from './CodeExporter';
import capitalizeFirstLetter from './utils/capitalizeFirstLetter';
import jsCommentsFactory from './utils/jsCommentsFactory';
import snippets from './snippets/index';

export type {
  CodesandboxFile,
  CodesandboxFiles,
  Snippet,
  GenerateOptions,
  OperationData,
  Options,
  OptionValues,
  Variables,
} from './CodeExporter';

export {
  computeOperationDataList,
  capitalizeFirstLetter,
  jsCommentsFactory,
  findUnusedOperationVariables,
  snippets,
  astByNamedPath,
  findFragmentVariables,
  extractNodeToConnectionFragment,
  namedPathOfAncestors,
  pruneOperationToNamedPath,
  renameOperation,
  makeAstDirective,
  updateAstAtPath,
  makeArgumentsDefinitionsDirective,
  makeArgumentsDirective,
};

export default CodeExporter;
