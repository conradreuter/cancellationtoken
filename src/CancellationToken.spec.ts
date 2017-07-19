import 'jest'
import CancellationToken from './CancellationToken'

describe('A cancellation token', () => {

  describe('that was created independently', () => {

    let cancel: (reason: any) => void
    let token: CancellationToken
    const reason = {}

    beforeEach(() => {
      ;({ cancel, token } = CancellationToken.create())
    })

    it('should not be cancelled immediately after creation', () => {
      expect(token.isCancelled).toBe(false)
    })

    it('should cancel correctly', () => {
      cancel(reason)
      expect(token.isCancelled).toBe(true)
      expect(token.reason).toBe(reason)
    })

    it('should resolve its promise upon cancellation', () => {
      cancel(reason)
      expect(token.whenCancelled).resolves.toBe(reason)
    })

    it('should reject a promise created via rejectWhenCancelled upon cancellation', async () => {
      cancel(reason)
      try {
        await token.rejectWhenCancelled()
        fail('Expected CancellationToken.Cancelled to be thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(CancellationToken.Cancelled)
        expect(err.reason).toBe(reason)
      }
    })

    it('should throw a CancelledError when throwIfCancelled is called and the token is cancelled', () => {
      cancel(reason)
      try {
        token.throwIfCancelled()
        fail('Expected CancellationToken.Cancelled to be thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(CancellationToken.Cancelled)
        expect(err.reason).toBe(reason)
      }
    })

    // TODO test for unhandled promise rejection warning
    it('should not reject a promise created with rejectWhenCancelled when the token is not cancelled', () => {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 500)
        token.rejectWhenCancelled().catch(reject)
      })
    })

    it('should not throw an error when throwIfCancelled is called and the token is not cancelled', () => {
      token.throwIfCancelled() // should not throw
    })

    it('should throw an error when accessing the reason before the token is cancelled', () => {
      expect(() => token.reason).toThrow()
    })
  })

  describe('that was created via all', () => {

    let cancel1: (reason: any) => void
    let cancel2: (reason: any) => void
    let token1: CancellationToken
    let token2: CancellationToken
    let token: CancellationToken
    const reason1 = {}
    const reason2 = {}

    beforeEach(() => {
      ;({ cancel: cancel1, token: token1 } = CancellationToken.create())
      ;({ cancel: cancel2, token: token2 } = CancellationToken.create())
      token = CancellationToken.all(token1, token2)
    })

    it('should be cancelled when all of the given tokens are cancelled', () => {
      cancel1(reason1)
      cancel2(reason2)
      expect(token.isCancelled).toBe(true)
      expect(token.reason).toHaveLength(2)
      expect(token.reason).toEqual(expect.arrayContaining([reason1, reason2]))
    })

    it('should not be cancelled when some of the given tokens are not cancelled', () => {
      cancel1(reason1)
      expect(token.isCancelled).toBe(false)
    })

    it('should resolve its promise when all of the given tokens are cancelled', () => {
      cancel1(reason1)
      cancel2(reason2)
      expect(token.whenCancelled).resolves.toHaveLength(2)
      expect(token.whenCancelled).resolves.toEqual(expect.arrayContaining([reason1, reason2]))
    })

    it('should be cancelled immediately after creation if all of the given tokens are already cancelled', () => {
      cancel1(reason1)
      cancel2(reason1)
      const token = CancellationToken.all(token1, token2)
      expect(token.isCancelled).toBe(true)
      expect(token.reason).toHaveLength(2)
      expect(token.reason).toEqual(expect.arrayContaining([reason1, reason2])
    })
  })

  describe('that was created via race', () => {

    let cancel1: (reason: any) => void
    let token1: CancellationToken
    let token2: CancellationToken
    let token: CancellationToken
    const reason = {}

    beforeEach(() => {
      ;({ cancel: cancel1, token: token1 } = CancellationToken.create())
      ;({ token: token2 } = CancellationToken.create())
      token = CancellationToken.race(token1, token2)
    })

    it('should be cancelled when at least one of the given tokens is cancelled', () => {
      cancel1(reason)
      expect(token.isCancelled).toBe(true)
      expect(token.reason).toBe(reason)
    })

    it('should not be cancelled when none of the given tokens are cancelled', () => {
      expect(token.isCancelled).toBe(false)
    })

    it('should resolve its promise when at least one of the given tokens is cancelled', () => {
      cancel1(reason)
      expect(token.whenCancelled).resolves.toBe(reason)
    })

    it('should be cancelled immediately after creation if one of the given tokens is already cancelled', () => {
      cancel1(reason)
      const token = CancellationToken.race(token1, token2)
      expect(token.isCancelled).toBe(true)
      expect(token.reason).toBe(reason)
    })
  })
})

describe('The CONTINUE cancellation token', () => {

  it('is not cancelled', () => {
    expect(CancellationToken.CONTINUE.isCancelled).toBe(false)
  })
})

describe('The CANCEL cancellation token', () => {

  it('is cancelled', () => {
    expect(CancellationToken.CANCEL.isCancelled).toBe(true)
  })
})
