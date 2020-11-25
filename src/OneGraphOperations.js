// @flow
import sha1 from 'js-sha1';

const encoder = new TextEncoder();

const computeGitHash = source =>
  sha1('blob ' + encoder.encode(source).length + '\0' + source);

window.computeGitHash = computeGitHash;

// This setup is only needed once per application
async function fetchOneGraph(operationsDoc, operationName, variables) {
  const result = await fetch(
    'https://serve.onegraph.io/graphql?app_id=af3246eb-92a6-4dc6-ac78-e1b3d0c31212',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer _7_g7CP7XMws-Wy5IbGmIu7RmI3jo5E6lpEmtYItVW0',
      },
      body: JSON.stringify({
        query: operationsDoc,
        variables: variables,
        operationName: operationName,
      }),
    },
  );

  return await result.json();
}

export function fetchFindMeOnGitHub() {
  return fetchOneGraph(
    `
query FindMeOnGitHub {
  me {
    github {
      id
      login
      repositories(
        first: 100
        orderBy: { field: CREATED_AT, direction: DESC }
        affiliations: [
          OWNER
          COLLABORATOR
          ORGANIZATION_MEMBER
        ]
        ownerAffiliations: [
          OWNER
          COLLABORATOR
          ORGANIZATION_MEMBER
        ]
      ) {
        edges {
          node {
            id
            nameWithOwner
          }
        }
        totalCount
      }
    }
  }
}`,
    'FindMeOnGitHub',
    {},
  );
}

const operationsDoc = `
 mutation CreateTree($path: String!, $treeJson: JSON!) {
  gitHub {
    makeRestCall {
      post(
        path: $path
        jsonBody: $treeJson
        contentType: "application/json"
        accept: "application/json"
      ) {
        response {
          statusCode
        }
        jsonBody
      }
    }
  }
}

fragment GitHubRefFragment on GitHubRef {
  id
  name
  target {
    id
    oid
    ... on GitHubCommit {
      history(first: 1) {
        edges {
          node {
            tree {
              entries {
                name
                path
                oid
                object {
                  ... on GitHubTree {
                    id
                    entries {
                      name
                      path
                      oid
                    }
                  }
                }
              }
            }
          }
        }
      }
      tree {
        id
        oid
      }
    }
  }
}

query DefaultBranchRef($owner: String!, $name: String!) {
  gitHub {
    repository(name: $name, owner: $owner) {
      id
      defaultBranchRef {
        ...GitHubRefFragment
      }
    }
  }
}

query FilesOnRef($owner: String!, $name: String!, $fullyQualifiedRefName: String!) {
  gitHub {
    repository(name: $name, owner: $owner) {
      id
      ref(qualifiedName: $fullyQualifiedRefName) {
        ...GitHubRefFragment
      }
    }
  }
}

mutation CreateRepo($repoJson: JSON!) {
  gitHub {
    makeRestCall {
      post(
        path: "/user/repos"
        jsonBody: $repoJson
        contentType: "application/json"
        accept: "application/json"
      ) {
        response {
          statusCode
        }
        jsonBody
      }
    }
  }
}

mutation CreateCommit($path: String!, $commitJson: JSON!) {
  gitHub {
    makeRestCall {
      post(path: $path, jsonBody: $commitJson) {
        response {
          statusCode
        }
        jsonBody
      }
    }
  }
}

mutation CreateRef(
  $repositoryId: ID!
  $name: String!
  $oid: GitHubGitObjectID!
) {
  gitHub {
    createRef(
      input: {
        repositoryId: $repositoryId
        name: $name
        oid: $oid
      }
    ) {
      ref {
        ...GitHubRefFragment
      }
    }
  }
}

mutation UpdateRef($refId: ID!, $sha: GitHubGitObjectID!) {
  gitHub {
    updateRef(input: { refId: $refId, oid: $sha }) {
      clientMutationId
      ref {
        name
        id
        target {
          oid
          id
        }
      }
    }
  }
}
`;

export function executeCreateTree(owner, name, treeJson) {
  const path = `/repos/${owner}/${name}/git/trees`;
  return fetchOneGraph(operationsDoc, 'CreateTree', {
    path: path,
    treeJson: treeJson,
  });
}

window.executeCreateTree = executeCreateTree;

export function fetchDefaultBranchRef(owner, name) {
  return fetchOneGraph(operationsDoc, 'DefaultBranchRef', {
    owner: owner,
    name: name,
  });
}

window.fetchDefaultBranchRef = fetchDefaultBranchRef;

export function fetchFilesOnRef(owner, name, fullyQualifiedRefName) {
  return fetchOneGraph(operationsDoc, 'FilesOnRef', {
    owner: owner,
    name: name,
    fullyQualifiedRefName: fullyQualifiedRefName,
  });
}

window.fetchDefaultBranchRef = fetchDefaultBranchRef;

export function executeCreateRepo(name: string) {
  return fetchOneGraph(operationsDoc, 'CreateRepo', {
    repoJson: {name: name, auto_init: true},
  });
}

window.executeCreateRepo = executeCreateRepo;

export function executeCreateCommit(owner, name, commitJson) {
  const path = `/repos/${owner}/${name}/git/commits`;
  return fetchOneGraph(operationsDoc, 'CreateCommit', {
    path: path,
    commitJson: commitJson,
  });
}

window.executeCreateCommit = executeCreateCommit;

export function executeUpdateRef(refId, sha) {
  return fetchOneGraph(operationsDoc, 'UpdateRef', {refId, sha});
}

export function executeCreateRef({repositoryId, name, oid}) {
  return fetchOneGraph(operationsDoc, 'CreateRef', {repositoryId, name, oid});
}

type TreeFiles = {
  [string]: {|
    content: string | Object,
  |},
};

export const pushFilesToBranch = async function({
  owner,
  name,
  message,
  branch,
  treeFiles: rawTreeFiles,
  acceptOverrides,
}: {
  owner: string,
  name: string,
  branch: string,
  message: string,
  treeFiles: TreeFiles,
  acceptOverrides: ?boolean,
}): Promise<
  | {ok: 'empty-changeset'}
  | {
      ok: 'success',
      result: any,
      treeJson: any,
      treeResults: any,
      commitJson: any,
      commitResult: any,
      updateRefResult: any,
    }
  | {confirmationNeeded: string, changeset: any, originalTreeFiles: TreeFiles}
  | {error: string}
  | null,
> {
  const fileHashes = rawTreeFiles.reduce((acc, next) => {
    acc[next.path] = computeGitHash(next.content);
    return acc;
  }, {});

  window.fileHashes = fileHashes;
  const result = await fetchDefaultBranchRef(owner, name);
  const repositoryId = result?.data?.gitHub?.repository?.id;
  const defaultBranchRef = result?.data?.gitHub?.repository?.defaultBranchRef;
  const defaultBranchRefName =
    result?.data?.gitHub?.repository?.defaultBranchRef?.name;

  // By default we're going to base our commit off of the latest default branch head
  let headRefNodeId = defaultBranchRef?.id;
  let headRefCommitSha = defaultBranchRef?.target?.oid;
  let headRefTreeSha = defaultBranchRef?.target?.tree?.oid;
  // eslint-disable-next-line
  let headRefTreeNodeId = defaultBranchRef?.target?.tree?.id;

  let existingFiles =
    defaultBranchRef?.target?.history?.edges?.[0]?.node?.tree?.entries || [];

  const pushingToNonDefaultBranch = branch !== defaultBranchRefName;

  const fullyQualifiedRefName = `refs/heads/${branch}`;

  // But if we're pushing to a non-default branch, we should check to see if the branch exists, and if so, update our assumptions
  if (pushingToNonDefaultBranch) {
    let filesOnRefResult = await fetchFilesOnRef(
      owner,
      name,
      fullyQualifiedRefName,
    );
    let branchRef = filesOnRefResult?.data?.gitHub?.repository?.ref;
    // eslint-disable-next-line
    let branchRefName = branchRef?.name;

    if (!branchRef) {
      // If the branchRef doesn't exist, then we create a new ref pointing to the head default ref
      const createRefResult = await executeCreateRef({
        repositoryId,
        name: fullyQualifiedRefName,
        oid: headRefCommitSha,
      });

      branchRef = createRefResult?.data?.gitHub?.createRef?.ref;
      if (!branchRef) {
        return {error: `Failed to create branch '${branch}'`};
      }
    }

    branchRefName = branchRef?.name;
    existingFiles =
      branchRef?.target?.history?.edges?.[0]?.node?.tree?.entries || [];

    headRefNodeId = branchRef?.id;
    headRefCommitSha = branchRef?.target?.oid;
    headRefTreeSha = branchRef?.target?.tree?.oid;
    headRefTreeNodeId = branchRef?.target?.tree?.id;
  }

  const findExistingFileByPath = path => {
    const parts = path.split('/');
    let candidates = existingFiles;

    const helper = parts => {
      const next = parts[0];
      const remainingParts = parts.slice(1);
      const nextFile = candidates.find(gitFile => gitFile.name === next);

      if (!nextFile) return null;

      if (remainingParts.length === 0) {
        return nextFile;
      }

      candidates = nextFile.object?.entries || [];
      return helper(remainingParts);
    };

    return helper(parts);
  };

  // Try to calculate the minimum number of files we can upload
  const changeset = rawTreeFiles.reduce(
    (acc, file) => {
      // This will only look two levels down since that's the limit of our GraphQL query
      const existingFile = findExistingFileByPath(file.path);
      if (!existingFile) {
        acc['new'] = [...acc.new, file];
        return acc;
      }

      // This file already exists, so check if the hash is the same
      if (fileHashes[file.path] === existingFile.oid) {
        const tempFile = {
          ...file,
        };

        delete tempFile['content'];

        acc['unchanged'] = [
          ...acc.unchanged,
          {...tempFile, sha: fileHashes[file.path]},
        ];
        return acc;
      }

      // The file exists, but its hash has changed;
      acc['changed'] = [...acc.changed, file];
      return acc;
    },
    {unchanged: [], new: [], changed: []},
  );

  // Don't bother uploading files with unchanged hashes (Git will filter these out of a changeset anyway)
  const treeFiles = [...changeset.new, ...changeset.changed];

  if (treeFiles.length === 0) {
    return {ok: 'empty-changeset'};
  }

  if ((changeset.changed || []).length > 0 && !acceptOverrides) {
    return {
      confirmationNeeded: 'Some files have changed and will be overwritten',
      changeset,
      originalTreeFiles: rawTreeFiles,
    };
  }

  const treeJson = {
    base_tree: headRefTreeSha,
    tree: treeFiles,
  };

  window.changeset = changeset;
  //   return treeJson;

  if (!headRefTreeSha) return {error: 'Failed to find sha of head ref tree'};

  const treeResults = await executeCreateTree(owner, name, treeJson);
  const newTreeSha =
    treeResults?.data?.gitHub?.makeRestCall?.post?.jsonBody?.sha;

  const commitJson = {
    message: message,
    tree: newTreeSha,
    parents: [headRefCommitSha],
  };
  if (!newTreeSha || !headRefCommitSha) {
    return {
      error: 'Failed to find git tree sha',
    };
  }

  const commitResult = await executeCreateCommit(owner, name, commitJson);
  const commitRefId =
    commitResult?.data?.gitHub?.makeRestCall?.post?.jsonBody?.node_id;
  const commitSha =
    commitResult?.data?.gitHub?.makeRestCall?.post?.jsonBody?.sha;

  if (!commitRefId || !commitSha)
    return {error: 'Failed to find appropriate commit sha'};

  const updateRefResult = await executeUpdateRef(headRefNodeId, commitSha);

  return {
    ok: 'success',
    result,
    treeJson,
    treeResults,
    commitJson,
    commitResult,
    updateRefResult,
  };
};

window.pushFilesToBranch = pushFilesToBranch;

/**
1. Check if repo exists
2. If not, create via rest with auto_init:true
3. Get the defaultRef head
4. Get the head commit, store sha (oid)
5. Create a tree with the file
6. Create a commit with the tree
7. Point the default head ref to commit



*/

/**

# 1
query DefaultBranchRef(
  $owner: String!
  $name: String!
) {
  gitHub {
    repository(name: $name, owner: $owner) {
      defaultBranchRef {
        id
        name
        target {
          id
          oid
          ... on GitHubCommit {
            tree {
              id
              oid
            }
          }
        }
      }
    }
  }
}

# 2
mutation RestCreateRepo($repoJson: JSON!) {
  gitHub {
    makeRestCall {
      post(
        path: "/user/repos"
        jsonBody: $repoJson
        contentType: "application/json"
        accept: "application/json"
      ) {
        response {
          statusCode
          headers
        }
        jsonBody
      }
    }
  }
}

# 3 (same as #1)
# 4 (same as #1)

# 5
mutation CreateTree($treeJson: JSON!) {
  gitHub {
    makeRestCall {
      post(
        path: "/repos/sgrove/made-from-rest/git/trees"
        jsonBody: $treeJson
        contentType: "application/json"
        accept: "application/json"
      ) {
        response {
          statusCode
          headers
        }
        jsonBody
      }
    }
  }
}
{"treeJson": {
  "baseTree":"ffd168b9423afc5e9fdf519297c5bb0688ac6c31",
  "tree": [
    {
      "type": "commit",
      "path": "second-file",
      "mode": "100644",
      "content": "Got some content here"
    }
  ]
}}

# 6
mutation CreateCommit($commitJson: JSON = "") {
  gitHub {
    makeRestCall {
      post(
        path: "/repos/sgrove/made-from-rest/git/commits"
        jsonBody: $commitJson
      ) {
        response {
          statusCode
        }
        jsonBody
      }
    }
  }
}

#7
mutation UpdateRef {
  gitHub {
    updateRef(
      input: {
        refId: "MDM6UmVmMzE0NjU3NTY2OnJlZnMvaGVhZHMvbWFpbg=="
        oid: "db478fb4e5ac88341c0498d8d257b77c304be3da"
      }
    ) {
      clientMutationId
      ref {
        name
        id
        target {
          oid
          id
        }
      }
    }
  }
}
 */
