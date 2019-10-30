// @flow

import CodeExporter from './CodeExporter';
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

export {capitalizeFirstLetter, jsCommentsFactory, snippets};

export default CodeExporter;
