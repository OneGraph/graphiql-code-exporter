// @flow

import CodeExporter, {computeOperationDataList} from './CodeExporter';
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
  snippets,
};

export default CodeExporter;
