import CancellationToken from 'cancellationtoken'

const { cancel, token } = CancellationToken.create()
fibonacci((n, fib) => {
  console.log(`fib(${n}) = ${fib}`)
  if (n >= 9) cancel()
}, token)

function fibonacci(callback: (n: number, fib: number) => void, token: CancellationToken): void {
  let n: number = 0
  let fib: number = 1
  let next: number = 1

  setTimeout(generateNext, 0)

  function generateNext() {
    if (token.isCancelled) return
    callback(n, fib)
    ;[fib, next] = [next, fib + next]
    ++n
    setTimeout(generateNext, 0)
  }
}
