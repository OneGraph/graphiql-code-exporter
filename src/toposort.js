// @flow
import type {FragmentDefinitionNode, OperationDefinitionNode} from 'graphql';
import type {OperationData} from './CodeExporter.js';

type stringBoolMap = {[string]: boolean};

const operationDataByName = (
  graph: Array<OperationData>,
  name: string,
): ?OperationData => {
  return graph.find(operationData => operationData.name === name);
};

function topologicalSortHelper(
  node: OperationData,
  visited: stringBoolMap,
  temp: stringBoolMap,
  graph: Array<OperationData>,
  result,
) {
  temp[node.name] = true;
  var neighbors = node.fragmentDependencies;
  for (var i = 0; i < neighbors.length; i += 1) {
    var fragmentDependency = neighbors[i];
    var fragmentOperationData = operationDataByName(
      graph,
      fragmentDependency.name.value,
    );

    if (!fragmentOperationData) {
      continue;
    }

    if (temp[fragmentOperationData.name]) {
      console.error('The operation graph has a cycle');
      continue;
    }
    if (!visited[fragmentOperationData.name]) {
      topologicalSortHelper(
        fragmentOperationData,
        visited,
        temp,
        graph,
        result,
      );
    }
  }
  temp[node.name] = false;
  visited[node.name] = true;
  result.push(node);
}

export default function toposort(graph: Array<OperationData>) {
  var result: Array<OperationData> = [];
  var visited = {};
  var temp = {};
  for (var node of graph) {
    if (!visited[node.name] && !temp[node.name]) {
      topologicalSortHelper(node, visited, temp, graph, result);
    }
  }
  return result;
}
