export default function commentFactory(commentsEnabled, comments) {
  return id => (commentsEnabled ? '// ' + comments[id] : '');
}
