import type { LoggerService } from '@nestjs/common';

const dim = (s: string) => `\x1b[90m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

const ROUTE_MAPPED = /^Mapped \{([^,]+),\s*(\w+)\} route/;
const CONTROLLER_MAPPING = /^(\w+Controller) \{([^}]+)\}:?$/;

type RouteEntry = { method: string; path: string };

export class PrettyLogger implements LoggerService {
  private routeBuffer: RouteEntry[] = [];
  private currentController = '';
  private depInitBuffer: { message: string; count: number } | null = null;

  private flushDepInit(): void {
    if (!this.depInitBuffer) return;
    const { message, count } = this.depInitBuffer;
    const time = dim(this.formatTime());
    const suffix = count > 1 ? dim(` ×${count}`) : '';
    console.log(`${time} ${dim('  ├')} ${message.trim()}${suffix}`);
    this.depInitBuffer = null;
  }

  private flushRoutes(controllerLabel?: string): void {
    if (this.routeBuffer.length === 0) return;
    const prefix = controllerLabel ? cyan(`  ${controllerLabel}\n`) : cyan('  Routes\n');
    const lines = this.routeBuffer
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((r) => `    ${dim(r.method.padEnd(6))} ${r.path}`)
      .join('\n');
    console.log(prefix + lines + '\n');
    this.routeBuffer = [];
  }

  private formatTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  log(message: string, _context?: string): void {
    const msg = typeof message === 'string' ? message : String(message);

    if (msg.includes('dependencies initialized')) {
      this.flushRoutes(this.currentController);
      this.currentController = '';
      const trimmed = msg.trim();
      if (this.depInitBuffer && this.depInitBuffer.message === trimmed) {
        this.depInitBuffer.count += 1;
      } else {
        this.flushDepInit();
        this.depInitBuffer = { message: trimmed, count: 1 };
      }
      return;
    }

    this.flushDepInit();

    const time = dim(this.formatTime());

    const routeMatch = msg.match(ROUTE_MAPPED);
    if (routeMatch) {
      this.routeBuffer.push({ path: routeMatch[1].trim(), method: routeMatch[2] });
      return;
    }

    const controllerMatch = msg.match(CONTROLLER_MAPPING);
    if (controllerMatch) {
      const prev = this.currentController;
      this.currentController = controllerMatch[1] + ' ' + controllerMatch[2];
      this.flushRoutes(prev);
      return;
    }

    this.flushRoutes(this.currentController);

    if (msg.includes('Nest application successfully started')) {
      this.flushRoutes(this.currentController);
      this.currentController = '';
      console.log(green('  ✓ ') + bold('Application is running') + '\n');
      return;
    }

    if (msg.includes('Starting Nest application')) {
      console.log(`${time} ${cyan('Bootstrap')} ${msg}`);
      return;
    }

    console.log(`${time} ${cyan('App')} ${msg}`);
  }

  error(message: string, trace?: string, context?: string): void {
    this.flushDepInit();
    this.flushRoutes();
    const time = dim(this.formatTime());
    console.error(`${time} ${red('ERROR')} ${context ? `[${context}] ` : ''}${message}`);
    if (trace) console.error(dim(trace));
  }

  warn(message: string, context?: string): void {
    this.flushDepInit();
    this.flushRoutes();
    const time = dim(this.formatTime());
    console.warn(`${time} ${yellow('WARN')} ${context ? `[${context}] ` : ''}${message}`);
  }

  debug(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'production') return;
    this.flushDepInit();
    this.flushRoutes();
    const time = dim(this.formatTime());
    console.log(`${time} ${dim('DEBUG')} ${context ? `[${context}] ` : ''}${message}`);
  }

  verbose(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'production') return;
    this.flushDepInit();
    this.flushRoutes();
    const time = dim(this.formatTime());
    console.log(`${time} ${dim('VERBOSE')} ${context ? `[${context}] ` : ''}${message}`);
  }
}
