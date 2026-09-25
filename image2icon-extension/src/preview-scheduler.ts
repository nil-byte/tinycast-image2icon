export type PreviewExecutor<TRequest, TResult> = (
  request: TRequest,
) => Promise<TResult>;
export type PreviewCallbacks<TRequest, TResult> = {
  onResult: (result: TResult, request: TRequest) => void;
  onError: (error: unknown, request: TRequest) => void;
};

type Pending<TRequest> = { revision: number; request: TRequest };

export class PreviewScheduler<TRequest, TResult> {
  private revision = 0;
  private pending: Pending<TRequest> | null = null;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly execute: PreviewExecutor<TRequest, TResult>,
    private readonly callbacks: PreviewCallbacks<TRequest, TResult>,
    private readonly debounceMilliseconds = 0,
  ) {}

  request(request: TRequest): number {
    const revision = ++this.revision;
    this.pending = { revision, request };
    if (!this.running) this.schedule();
    return revision;
  }

  invalidate(): void {
    this.revision += 1;
    this.pending = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drain();
    }, this.debounceMilliseconds);
  }

  private async drain(): Promise<void> {
    if (this.running || !this.pending) return;
    const current = this.pending;
    this.pending = null;
    this.running = true;
    try {
      const result = await this.execute(current.request);
      if (current.revision === this.revision)
        this.callbacks.onResult(result, current.request);
    } catch (error) {
      if (current.revision === this.revision)
        this.callbacks.onError(error, current.request);
    } finally {
      this.running = false;
      if (this.pending) this.schedule();
    }
  }
}
