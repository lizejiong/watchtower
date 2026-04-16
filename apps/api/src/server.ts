export function startApiServer() {
  return 'watchtower-api'
}

if (process.env.NODE_ENV !== 'test') {
  console.log(startApiServer())
}
