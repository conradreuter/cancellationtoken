import CancellationToken from 'cancellationtoken'

class Scheduler {
  private readonly _tasksAndTokens: {task: Task; token: CancellationToken}[]

  public constructor() {
    this._tasksAndTokens = []
    this._executeNextTask()
  }

  private _executeNextTask(): void {
    setTimeout(() => this._executeNextTask(), 1000)
    let nextTask: Task | undefined
    while (!nextTask && this._tasksAndTokens.length > 0) {
      const {task, token} = this._tasksAndTokens.shift()!
      if (!token.isCancelled) {
        nextTask = task
      }
    }
    if (nextTask) {
      setTimeout(nextTask, 0)
    }
  }

  public schedule(task: Task, token: CancellationToken = CancellationToken.CONTINUE): void {
    this._tasksAndTokens.push({task, token})
  }
}

interface Task {
  (): void
}

const scheduler = new Scheduler()
const {cancel, token} = CancellationToken.create()
scheduler.schedule(task1)
scheduler.schedule(task2, token)
scheduler.schedule(() => process.exit(0))

function task1() {
  console.log('yay! (:')
  cancel()
}

function task2() {
  throw new Error('nay! ):')
}
