/**
 * A token that can be passed around to inform consumers of the token that a
 * certain operation has been cancelled.
 */
class CancellationToken {

  /**
   * Create a new {CancellationToken}.
   *
   * @param isCancelled A function determining if the token is cancelled.
   * @param whenCancelled A promise that will be resolved when the token is cancelled.
   */
  public constructor(
    private readonly _isCancelled: () => boolean,
    private readonly _whenCancelled: Promise<void>,
  ) {
  }

  /**
   * Whether the token is cancelled.
   */
  public get isCancelled(): boolean {
    return this._isCancelled()
  }

  /**
   * A promise that will be resolved when this token is cancelled.
   */
  public get whenCancelled(): Promise<void> {
    return this._whenCancelled
  }

  /**
   * Throw a {CancelledError} if this token is cancelled.
   */
  public throwIfCancelled(): void {
    if (this.isCancelled) {
      throw new CancellationToken.Cancelled()
    }
  }
}

/* istanbul ignore next: namespaces not handled correctly by jest */
namespace CancellationToken {

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
    cancel()
    return token
  })()

  /**
   * Create a new, independent {CancellationToken}.
   *
   * @returns the cancellation token and a function to cancel it.
   */
  export function create(): { token: CancellationToken, cancel: () => void } {
    let isCancelled: boolean = false
    let cancel: any // cannot use correct type here, because of "used before assigned" error
    const whenCancelled = new Promise<void>(resolve => {
      cancel = () => {
        isCancelled = true
        resolve()
      }
    })
    const token = new CancellationToken(() => isCancelled, whenCancelled)
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
    const isCancelled = () => tokens.every(token => token.isCancelled)
    const whenCancelled = Promise.all(tokens.map(token => token.whenCancelled)) as Promise<any>
    return new CancellationToken(isCancelled, whenCancelled)
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
    const isCancelled = () => tokens.some(token => token.isCancelled)
    const whenCancelled = Promise.race(tokens.map(token => token.whenCancelled))
    return new CancellationToken(isCancelled, whenCancelled)
  }

  /**
   * The error that is thrown when a {CancellationToken} has been cancelled and a
   * consumer of the token calls {CancellationToken.throwIfCancelled} on it.
   */
  export class Cancelled extends Error {

    public constructor() {
      super('Operation cancelled')
      Object.setPrototypeOf(this, Cancelled.prototype)
    }
  }
}

export default CancellationToken
