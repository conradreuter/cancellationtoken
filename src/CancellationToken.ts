/**
 * A token that can be passed around to inform consumers of the token that a
 * certain operation has been cancelled.
 */
class CancellationToken {
  private _reason: any;
  private _callbacks: ((reason?: any) => void)[] = [];

  /**
   * A cancellation token that is already cancelled.
   */
  public static readonly CANCELLED: CancellationToken = new CancellationToken(true, true);

  /**
   * A cancellation token that is never cancelled.
   */
  public static readonly CONTINUE: CancellationToken = new CancellationToken(false, false);

  /**
   * Gets a value indicating whether the token has been cancelled.
   */
  public get isCancelled(): boolean {
    return this._isCancelled;
  }

  /**
   * Gets the reason why this token has been cancelled.
   */
  public get reason(): any {
    if (this.isCancelled) {
      return this._reason;
    } else {
      throw new Error("This token is not canceled.");
    }
  }

  /**
   * Returns a promise that resolves when some operation resolves,
   * or rejects when the operation is rejected or this token is canceled.
   */
  public racePromise<T>(operation: Promise<T>): Promise<T> {
    if (this.canBeCancelled) {
      return new Promise<T>((resolve, reject) => {
        const unregister = this.onCancelled(reason => {
          reject(new CancellationToken.CancellationError(reason));
        });
        operation.then(
          value => {
            resolve(value);
            unregister();
          },
          reason => {
            reject(reason);
            unregister();
          });
      });
    } else {
      return operation;
    }
  }

  /**
   * Throw a {CancellationToken.CancellationError} instance if this token is cancelled.
   */
  public throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new CancellationToken.CancellationError(this.reason);
    }
  }

  /**
   * Requests a callback when cancellation occurs.
   * If this token is already cancelled, the callback is invoked before returning.
   * @param cb The method to invoke when cancellation occurs, with the reason.
   * @returns A method that revokes the request for notification.
   */
  public onCancelled(cb: (reason?: any) => void): () => void {
    if (this.canBeCancelled) {
      if (this.isCancelled) {
        cb(this.reason);
      } else {
        this._callbacks.push(cb);
        return () => {
          const idx = this._callbacks.indexOf(cb);
          if (idx >= 0) {
            this._callbacks.splice(idx, 1);
          }
        };
      }
    }

    return () => { };
  }

  private constructor(
    /**
     * Whether the token is already canceled.
     */
    private _isCancelled: boolean,

    /**
     * Whether the token can be cancelled.
     */
    public readonly canBeCancelled: boolean) {
  }

  /**
   * Creates a {CancellationToken} and a method that can cancel it.
   * @returns The token, and a function that cancels it.
   */
  public static create(): { token: CancellationToken, cancel: (reason?: any) => void } {
    const token = new CancellationToken(false, true);
    return {
      token: token,
      cancel: (reason?: any) => {
        token._isCancelled = true;
        token._reason = reason;
        token._callbacks.forEach(cb => {
          try {
            cb(reason);
          } catch (err) {
            // Swallow the error. No one wants to know.
            // Or given Node.js likes to crash for unobserved rejected promises, should we crash here?
          }
        });
        token._callbacks = []; // release memory associated with callbacks.
      },
    };
  }

  /**
   * Create a {CancellationToken} that is cancelled when all of the given tokens are cancelled.
   *
   * This is like {Promise<T>.all} for {CancellationToken}s.
   *
   * @param tokens The tokens that the new token depends on.
   * @returns a token that depends on the given tokens.
   */
  public static all(...tokens: CancellationToken[]): CancellationToken {
    let countdown = tokens.length;
    const cts = CancellationToken.create();
    const onCountdown = () => {
      if (--countdown === 0) {
        cts.cancel(tokens.map(ct => ct.reason));
      }
    };
    for (const token of tokens) {
      if (!token.canBeCancelled) {
        // If *any* of the tokens cannot be canceled, then the token we return can never be.
        return CancellationToken.CONTINUE;
      }

      if (token._isCancelled) {
        onCountdown();
      } else {
        token.onCancelled(onCountdown);
      }
    };

    return cts.token;
  }

  /**
   * Create a {CancellationToken} that is cancelled when at least one of the given tokens is cancelled.
   *
   * This is like {Promise<T>.race} for {CancellationToken}s.
   *
   * @param tokens The tokens that the new token depends on.
   * @returns a token that depends on the given tokens.
   */
  public static race(...tokens: CancellationToken[]): CancellationToken {
    for (const token of tokens) {
      if (token._isCancelled) {
        return token;
      }
    }

    const cts = CancellationToken.create();
    let unregistrations: (() => void)[];
    const cb = (reason?: any) => {
      // Unregister from all tokens to release memory.
      unregistrations.forEach(unregister => unregister());
      cts.cancel(reason);
    };
    unregistrations = tokens.map(token => token.onCancelled(cb));
    return cts.token;
  }
}

module CancellationToken {
  /**
   * The error that is thrown when a {CancellationToken} has been cancelled and a
   * consumer of the token calls {CancellationToken.throwIfCancelled} on it.
   */
  export class CancellationError extends Error {

    public constructor(

      /**
       * The reason why the token was cancelled.
       */
      public readonly reason: any
    ) {
      super(`Operation cancelled (${JSON.stringify(reason)})`); /* istanbul ignore next: see https://github.com/gotwarlost/istanbul/issues/690 */
      Object.setPrototypeOf(this, CancellationError.prototype);
    }
  }
}

export default CancellationToken
