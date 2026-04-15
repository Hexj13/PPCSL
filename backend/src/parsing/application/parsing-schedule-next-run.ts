import parser from 'cron-parser';

export function computeNextRunAtFromCron(params: {
  cronExpression: string;
  timezone: string;
  from: Date;
}): Date {
  const interval = parser.parseExpression(params.cronExpression, {
    tz: params.timezone,
    currentDate: params.from,
  });
  return interval.next().toDate();
}

export function computeNextRunAtFromCronAfter(params: {
  cronExpression: string;
  timezone: string;
  from: Date;
  minAfter: Date;
}): Date {
  let cursor = params.from;
  let next = computeNextRunAtFromCron({
    cronExpression: params.cronExpression,
    timezone: params.timezone,
    from: cursor,
  });
  let guard = 0;
  while (next <= params.minAfter) {
    cursor = next;
    next = computeNextRunAtFromCron({
      cronExpression: params.cronExpression,
      timezone: params.timezone,
      from: cursor,
    });
    guard += 1;
    if (guard > 10_000) {
      throw new Error('Unable to compute next run after provided date');
    }
  }
  return next;
}
