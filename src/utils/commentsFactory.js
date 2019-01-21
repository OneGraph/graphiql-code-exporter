export default function commentFactory(commentsEnabled) {
  return id => (commentsEnabled ? '// ' + comments[id] : '')
}
