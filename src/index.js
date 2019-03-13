// @flow

import CodeExporter from './CodeExporter';
export type {Snippet} from './CodeExporter';

import capitalizeFirstLetter from './utils/capitalizeFirstLetter';
import commentsFactory from './utils/commentsFactory';
import snippets from './snippets/index';

export {capitalizeFirstLetter, commentsFactory, snippets};

export default CodeExporter;
