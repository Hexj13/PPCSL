export class ProcessingSemaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    this.permits = maxConcurrent;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }

  get queueLength(): number {
    return this.waiting.length;
  }

  get availablePermits(): number {
    return this.permits;
  }
}
