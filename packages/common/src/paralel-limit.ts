/// Allows at most `limit` jobs to be started at once
export class ParalelLimit {
    readonly limit: number;
    private runningJobs = 0;
    private readonly queue: (() => Promise<void>)[] = [];

    constructor(limit: number) {
        this.limit = limit;
    }

    private processQueue() {
        // TODO: Optimize by using a FIFO queue
        const newJobs = this.queue.splice(0, this.limit - this.runningJobs);
        this.runningJobs += newJobs.length;
        newJobs.forEach((job) => { job().catch((error: unknown) => { console.error(error) }) });
    }

    /// Queues a job for execution.
    /// Takes in a callback instead of a Promise, to delay
    /// the job start until no more than `limit` jobs are running.
    /// Returns a `Promise` that resolves when the job is done.
    runJob<T>(job: () => Promise<T> | T): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await job();
                    resolve(result);
                } catch (error) {
                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    reject(error);
                }
                --this.runningJobs;
                this.processQueue();
            });
            this.processQueue();
        });
    }
}

export async function asyncForEachWithLimit<T>(values: T[], callback: (value: T) => Promise<void>, limit: ParalelLimit) {
    await Promise.all(
        values.map(
            (value) => limit.runJob(() => callback(value))
        )
    );
}
