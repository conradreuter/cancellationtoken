import CancellationToken from 'cancellationtoken'

const {cancel, token} = CancellationToken.create()
console.log(token.isCancelled) // prints false
cancel()
console.log(token.isCancelled) // prints true
