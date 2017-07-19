/**
 * A token that can be passed around to inform consumers of the token that a
 * certain operation has been cancelled.
 */
interface CancellationToken {

  /**
   * Whether the token is cancelled.
   */
  readonly isCancelled: boolean

  /**
   * The reason why this token has been cancelled.
   */
  readonly reason: any

  /**
   * A promise that will be resolved with the reason when this token is cancelled.
   */
  readonly whenCancelled: Promise<any>

  /**
   * Create a promise that will be rejected with a {CancellationToken.Cancelled} instance when this token is cancelled.
   */
  rejectWhenCancelled(): Promise<void>

  /**
   * Throw a {CancellationToken.Cancelled} instance if this token is cancelled.
   */
  throwIfCancelled(): void
}

module CancellationToken {

  /**
   * A cancellation token that is never cancelled.
   */
  export const CONTINUE: CancellationToken = (() => {
    const { token } = create()
    return token
  })()

  /**
   * A cancellation token that is cancelled.
   */
  export const CANCEL: CancellationToken = (() => {
    const { cancel, token } = create()
    cancel('CANCEL')
    return token
  })()

  /**
   * Create a new, independent {CancellationToken}.
   *
   * @returns the cancellation token and a function to cancel it.
   */
  export function create(): { token: CancellationToken, cancel: (reason?: any) => void } {
    let isCancelled: boolean = false
    let cancel: any // cannot use correct type here, because of "used before assigned" error
    let reason: any
    const whenCancelled = new Promise<any>(resolve => {
      cancel = (_reason?: any) => {
        isCancelled = true
        reason = _reason
        resolve(reason)
      }
    })
    const token = createCancellationToken(
      () => isCancelled,
      () => reason,
      whenCancelled,
    )
    return { cancel, token }
  }

  /**
   * Create a {CancellationToken} that is cancelled when all of the given tokens are cancelled.
   *
   * This is like {Promise<T>.all} for {CancellationToken}s.
   *
   * @param tokens The tokens that the new token depends on.
   * @returns a token that depends on the given tokens.
   */
  export function all(...tokens: CancellationToken[]): CancellationToken {
    return createCancellationToken(
      () => tokens.every(token => token.isCancelled),
      () => tokens.map(token => token.reason),
      Promise.all(tokens.map(token => token.whenCancelled)),
    )
  }

  /**
   * Create a {CancellationToken} that is cancelled when at least one of the given tokens is cancelled.
   *
   * This is like {Promise<T>.race} for {CancellationToken}s.
   *
   * @param tokens The tokens that the new token depends on.
   * @returns a token that depends on the given tokens.
   */
  export function race(...tokens: CancellationToken[]): CancellationToken {
    return createCancellationToken(
      () => tokens.some(token => token.isCancelled),
      () => tokens.find(token => token.isCancelled)!.reason,
      Promise.race(tokens.map(token => token.whenCancelled)),
    )
  }

  /**
   * The error that is thrown when a {CancellationToken} has been cancelled and a
   * consumer of the token calls {CancellationToken.throwIfCancelled} on it.
   */
  export class Cancelled extends Error {

    public constructor(

      /**
       * The reason why the token was cancelled.
       */
      public readonly reason: any
    ) {
      super(`Operation cancelled (${JSON.stringify(reason)})`) /* istanbul ignore next: see https://github.com/gotwarlost/istanbul/issues/690 */
      Object.setPrototypeOf(this, Cancelled.prototype)
    }
  }
}

/**
 * Create a {CancellationToken}.
 *
 * @param isCancelled Whether the token was cancelled.
 * @param reason The reason why the token was cancelled.
 * @param whenCancelled A promise that will be resolved with the reason.
 * @returns a new cancellation token.
 */
function createCancellationToken(
  isCancelled: () => boolean,
  reason: () => any,
  whenCancelled: Promise<any>
): CancellationToken {
  let cache = {
    isCancelled: false,
    reason: undefined,
    update() {
      if (this.isCancelled) return
      if (isCancelled()) {
        this.isCancelled = true
        this.reason = reason()
      }
    }
  }
  cache.update()
  return {
    get isCancelled(): boolean {
      cache.update()
      return cache.isCancelled
    },
    get reason(): any {
      cache.update()
      if (!cache.isCancelled) {
        throw new Error('CancellationToken is not cancelled')
      }
      return cache.reason
    },
    get whenCancelled(): Promise<any> {
      return whenCancelled
    },
    rejectWhenCancelled(): Promise<void> {
      return whenCancelled.then(reason => {
        throw new CancellationToken.Cancelled(reason)
      })
    },
    throwIfCancelled(): void {
      cache.update()
      if (cache.isCancelled) {
        throw new CancellationToken.Cancelled(cache.reason)
      }
    }
  }
}

export default CancellationToken
