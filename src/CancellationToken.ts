const NOOP = () => {}

/**
 * A token that can be passed around to inform consumers of the token that a
 * certain operation has been cancelled.
 */
class CancellationToken {
  private _reason: any
  private _callbacks?: Set<(reason?: any) => void> = new Set()

  /**
   * A cancellation token that is already cancelled.
   */
  public static readonly CANCELLED: CancellationToken = new CancellationToken(true, true)

  /**
   * A cancellation token that is never cancelled.
   */
  public static readonly CONTINUE: CancellationToken = new CancellationToken(false, false)

  /**
   * Whether the token has been cancelled.
   */
  public get isCancelled(): boolean {
    return this._isCancelled
  }

  /**
   * Whether the token can be cancelled.
   */
  public get canBeCancelled(): boolean {
    return this._canBeCancelled;
  }

  /**
   * Why this token has been cancelled.
   */
  public get reason(): any {
    if (this.isCancelled) {
      return this._reason
    } else {
      throw new Error('This token is not cancelled.')
    }
  }

  /**
   * Make a promise that resolves when the async operation resolves,
   * or rejects when the operation is rejected or this token is cancelled.
   */
  public racePromise<T>(asyncOperation: Promise<T>): Promise<T> {
    if (!this.canBeCancelled) {
      return asyncOperation
    }
    return new Promise<T>((resolve, reject) => {
      // we could use Promise.finally here as soon as it's implemented in the major browsers
      const unregister = this.onCancelled((reason) =>
        reject(new CancellationToken.CancellationError(reason)),
      )
      asyncOperation.then(
        (value) => {
          resolve(value)
          unregister()
        },
        (err) => {
          reject(err)
          unregister()
        },
      )
    })
  }

  /**
   * Throw a {CancellationToken.CancellationError} if this token is cancelled.
   */
  public throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new CancellationToken.CancellationError(this._reason)
    }
  }

  /**
   * Invoke the callback when this token is cancelled.
   * If this token is already cancelled, the callback is invoked immediately.
   * Returns a function that unregisters the cancellation callback.
   */
  public onCancelled(cb: (reason?: any) => void): () => void {
    if (!this.canBeCancelled) {
      return NOOP
    }
    if (this.isCancelled) {
      cb(this.reason)
      return NOOP
    }

    /* istanbul ignore next */
    this._callbacks?.add(cb)
    return () => this._callbacks?.delete(cb)
  }

  private constructor(
    /**
     * Whether the token is already cancelled.
     */
    private _isCancelled: boolean,
    /**
     * Whether the token can be cancelled.
     */
    private _canBeCancelled: boolean,
  ) {}

  /**
   * Create a {CancellationTokenSource}.
   */
  public static create(): CancellationToken.Source {
    const token = new CancellationToken(false, true)

    const cancel = (reason?: any) => {
      if (token._isCancelled) return
      token._isCancelled = true
      token._reason = reason
      token._callbacks?.forEach((cb) => cb(reason))
      dispose()
    }

    const dispose = () => {
      token._canBeCancelled = token.isCancelled
      delete token._callbacks // release memory
    }

    return {token, cancel, dispose}
  }

  /**
   * Create a {CancellationTokenSource}.
   * The token will be cancelled automatically after the specified timeout in milliseconds.
   */
  public static timeout(ms: number): CancellationToken.Source {
    const {token, cancel: originalCancel, dispose: originalDispose} = CancellationToken.create()

    let timer: NodeJS.Timeout | null
    timer = setTimeout(() => originalCancel(CancellationToken.timeout), ms)
    const disposeTimer = () => {
      if (timer == null) return
      clearTimeout(timer)
      timer = null
    }

    const cancel = (reason?: any) => {
      disposeTimer()
      originalCancel(reason)
    }

    /* istanbul ignore next */
    const dispose = () => {
      disposeTimer()
      originalDispose()
    }

    return {token, cancel, dispose}
  }

  /**
   * Create a {CancellationToken} that is cancelled when all of the given tokens are cancelled.
   *
   * This is like {Promise<T>.all} for {CancellationToken}s.
   */
  public static all(...tokens: CancellationToken[]): CancellationToken {
    // If *any* of the tokens cannot be cancelled, then the token we return can never be.
    if (tokens.some((token) => !token.canBeCancelled)) {
      return CancellationToken.CONTINUE
    }

    const combined = CancellationToken.create()
    let countdown = tokens.length
    const handleNextTokenCancelled = () => {
      if (--countdown === 0) {
        const reasons = tokens.map((token) => token._reason)
        combined.cancel(reasons)
      }
    }
    tokens.forEach((token) => token.onCancelled(handleNextTokenCancelled))
    return combined.token
  }

  /**
   * Create a {CancellationToken} that is cancelled when at least one of the given tokens is cancelled.
   *
   * This is like {Promise<T>.race} for {CancellationToken}s.
   */
  public static race(...tokens: CancellationToken[]): CancellationToken {
    // If *any* of the tokens is already cancelled, immediately return that token.
    for (const token of tokens) {
      if (token._isCancelled) {
        return token
      }
    }

    const combined = CancellationToken.create()
    let unregistrations: (() => void)[]
    const handleAnyTokenCancelled = (reason?: any) => {
      unregistrations.forEach((unregister) => unregister()) // release memory
      combined.cancel(reason)
    }
    unregistrations = tokens.map((token) => token.onCancelled(handleAnyTokenCancelled))
    return combined.token
  }
}

/* istanbul ignore next */
namespace CancellationToken {
  /**
   * Provides a {CancellationToken}, along with some methods to operate on it.
   */
  export interface Source {
    /**
     * The token provided by this source.
     */
    token: CancellationToken

    /**
     * Cancel the provided token with the given reason.
     * Do nothing if the provided token cannot be cancelled or is already cancelled.
     */
    cancel(reason?: any): void

    /**
     * Dispose of the token and this source and release memory.
     */
    dispose(): void
  }

  /**
   * The error that is thrown when a {CancellationToken} has been cancelled and a
   * consumer of the token calls {CancellationToken.throwIfCancelled} on it.
   */
  export class CancellationError extends Error {
    public constructor(
      /**
       * The reason why the token was cancelled.
       */
      public readonly reason: any,
    ) {
      super('Operation cancelled')
      Object.setPrototypeOf(this, CancellationError.prototype)
    }
  }
}

export default CancellationToken
