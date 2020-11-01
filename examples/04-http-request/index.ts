import CancellationToken from 'cancellationtoken'
import * as Https from 'https'

;(async () => {
  await sendRequestWithTimeout(3000)
  console.log()
  await sendRequestWithTimeout(5)
})()

async function sendRequestWithTimeout(ms: number): Promise<void> {
  console.log(`Sending request with a timeout of ${ms}ms...`)
  const {token, cancel} = CancellationToken.timeout(ms)
  const request = Https.get('https://github.com')
  const unregister = token.onCancelled(() => request.abort())

  await new Promise((resolve) => {
    request.on('response', (response) => {
      console.log(`Response: ${response.statusCode} ${response.statusMessage}`)
      resolve()
    })

    request.on('abort', () => {
      request.on('error', () => {}) // ignore socket hang up error
      console.log('Aborted')
      resolve()
    })
  })

  unregister()
  cancel()
}
