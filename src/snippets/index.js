// javascript
import jsFetch from './javascript/fetch';
import jsReactApollo from './javascript/reactApollo';
import jsReactHooks from './javascript/reactHooks';
require('prismjs/components/javascript');

// ruby
import rubyGraphqlClient from './ruby/graphqlClient';
require('prismjs/components/ruby');

// python
import pythonGraphqlclient from './python/graphqlclient';
import pythonSgqlc from './python/sgqlc';
require('prismjs/components/python');

export default [
  jsFetch,
  jsReactApollo,
  jsReactHooks,
  rubyGraphqlClient,
  pythonGraphqlclient,
  pythonSgqlc,
];
