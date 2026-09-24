const CYCLE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export function supportsAutomaticRenewalCycle(cycle: string): boolean {
  return Object.prototype.hasOwnProperty.call(CYCLE_MONTHS, cycle);
}

export function advanceBillingDate(input: Date, cycle: string): Date {
  const months = CYCLE_MONTHS[cycle];
  if (!months) {
    throw new Error('Custom and one-time billing cycles require manual renewal dates');
  }

  const year = input.getUTCFullYear();
  const month = input.getUTCMonth();
  const day = input.getUTCDate();
  const hour = input.getUTCHours();
  const minute = input.getUTCMinutes();
  const second = input.getUTCSeconds();
  const ms = input.getUTCMilliseconds();

  const targetFirst = new Date(Date.UTC(year, month + months, 1, hour, minute, second, ms));
  const lastDay = new Date(Date.UTC(
    targetFirst.getUTCFullYear(),
    targetFirst.getUTCMonth() + 1,
    0,
  )).getUTCDate();

  return new Date(Date.UTC(
    targetFirst.getUTCFullYear(),
    targetFirst.getUTCMonth(),
    Math.min(day, lastDay),
    hour,
    minute,
    second,
    ms,
  ));
}

function advanceUntilAtLeast(input: Date, target: Date, cycle: string): Date {
  let value = new Date(input);
  for (let iteration = 0; iteration < 240 && value.getTime() < target.getTime(); iteration += 1) {
    value = advanceBillingDate(value, cycle);
  }
  if (value.getTime() < target.getTime()) {
    throw new Error('Unable to calculate the next service renewal date');
  }
  return value;
}

export function calculateRenewedServiceDates(input: {
  renewalForDate: Date;
  billingCycle: string;
  currentExpiryDate: Date | null;
  currentNextDueDate: Date | null;
}) {
  if (!supportsAutomaticRenewalCycle(input.billingCycle)) {
    throw new Error('Custom and one-time billing cycles require manual renewal dates');
  }

  const nextCycleDate = advanceBillingDate(input.renewalForDate, input.billingCycle);
  const nextDueDate = input.currentNextDueDate && input.currentNextDueDate.getTime() >= nextCycleDate.getTime()
    ? new Date(input.currentNextDueDate)
    : nextCycleDate;

  const expiryDate = input.currentExpiryDate
    ? input.currentExpiryDate.getTime() >= nextCycleDate.getTime()
      ? new Date(input.currentExpiryDate)
      : advanceUntilAtLeast(input.currentExpiryDate, nextCycleDate, input.billingCycle)
    : nextCycleDate;

  return { nextCycleDate, nextDueDate, expiryDate };
}
