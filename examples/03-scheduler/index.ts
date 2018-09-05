import CancellationToken from 'cancellationtoken'

class Scheduler {
  private readonly tasks: { task: Task; token: CancellationToken }[]

  public constructor() {
    this.tasks = []
    this.executeNextTask()
  }

  private executeNextTask(): void {
    setTimeout(() => this.executeNextTask(), 1000)
    while (this.tasks.length > 0) {
      const { task, token } = this.tasks.shift()!
      if (token.isCancelled) continue
      task()
      break
    }
  }

  public schedule(task: Task, token: CancellationToken = CancellationToken.CONTINUE): void {
    this.tasks.push({ task, token })
  }
}

interface Task {
  (): void
}

const scheduler = new Scheduler()
const { cancel, token } = CancellationToken.create()
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
