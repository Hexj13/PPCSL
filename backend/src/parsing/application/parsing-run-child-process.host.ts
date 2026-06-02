import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import { Injectable } from '@nestjs/common';

interface ActiveChild {
  child: ChildProcessWithoutNullStreams;
  killTimer: ReturnType<typeof setTimeout> | null;
}

@Injectable()
export class ParsingRunChildProcessHost {
  private readonly activeChildren = new Map<string, ActiveChild>();

  getActive(runId: string): ActiveChild | undefined {
    return this.activeChildren.get(runId);
  }

  register(runId: string, child: ChildProcessWithoutNullStreams): void {
    this.activeChildren.set(runId, { child, killTimer: null });
  }

  setKillTimer(runId: string, timer: ReturnType<typeof setTimeout>): void {
    const active = this.activeChildren.get(runId);
    if (active) {
      active.killTimer = timer;
    }
  }

  clearTimers(runId: string): void {
    const active = this.activeChildren.get(runId);
    if (active?.killTimer) {
      clearTimeout(active.killTimer);
    }
  }

  unregister(runId: string): void {
    this.clearTimers(runId);
    this.activeChildren.delete(runId);
  }

  failCleanup(runId: string): void {
    this.clearTimers(runId);
    this.activeChildren.delete(runId);
  }

  waitForChild(child: ChildProcessWithoutNullStreams): Promise<number> {
    return new Promise((resolve) => {
      child.once('close', (code) => {
        resolve(code ?? 0);
      });
      child.once('error', () => {
        resolve(1);
      });
    });
  }
}
