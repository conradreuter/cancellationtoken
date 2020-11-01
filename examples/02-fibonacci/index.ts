import CancellationToken from 'cancellationtoken'

const {cancel, token} = CancellationToken.create()
fibonacci((n, fib) => {
  console.log(`F(${n}) = ${fib}`)
  if (n >= 9) cancel()
}, token)

// keep  passing n and F(n) to the callback until the token is cancelled
function fibonacci(cb: (n: number, fib: number) => void, token: CancellationToken): void {
  let n: number = 0
  let fib: number = 1
  let next: number = 1

  setTimeout(generateNext, 0)

  function generateNext() {
    if (token.isCancelled) return
    cb(n, fib)
    ;[fib, next] = [next, fib + next]
    ++n
    setTimeout(generateNext, 0)
  }
}
