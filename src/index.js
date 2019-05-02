// @flow

import CodeExporter from './CodeExporter';
export type {
  Snippet,
  GenerateOptions,
  OperationData,
  Options,
  OptionValues,
  Variables,
} from './CodeExporter';

import capitalizeFirstLetter from './utils/capitalizeFirstLetter';
import jsCommentsFactory from './utils/jsCommentsFactory';
import snippets from './snippets/index';

export {capitalizeFirstLetter, jsCommentsFactory, snippets};

export default CodeExporter;
