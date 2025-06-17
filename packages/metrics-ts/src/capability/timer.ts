/**
 * Timer - measures call-rate of a function and the distribution of the duration of all calls
 */
import { performance } from "perf_hooks";
import { timerData, TimerSeverity, tracePoint } from "../rawData";
import { traceId } from "../tracing";
import { appendOutput, appendOutputSync } from "../writer";

/**
 * Thresholds for categorizing the duration of a call.
 * Values are in milliseconds.
 */
const DEFAULT_FAST = 1;
const DEFAULT_NORMAL = 20;

export interface TimerOptions {
  fast?: number;
  normal?: number;
}
export const MSTimer = (fn: string, options: TimerOptions = {}) => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  /* eslint-disable  @typescript-eslint/explicit-module-boundary-types */
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    /**
     * get essential properties
     */
    const data: tracePoint = {
      traceId: traceId(),
      file: fn,
      class: target.constructor.name,
      method: originalMethod.name,
      timestamp: Date.now(),
    };

    const fast = options.fast ?? DEFAULT_FAST;
    const normal = options.normal ?? DEFAULT_NORMAL;

    if (originalMethod.constructor.name === "AsyncFunction") {
      descriptor.value = async function (...args: any[]) {
        const start = performance.now();
        const result = await originalMethod.apply(this, args);
        const end = performance.now();
        const duration = end - start;
        let severity: TimerSeverity;
        if (duration > normal) {
          severity = TimerSeverity.Slow;
        } else if (duration > fast) {
          severity = TimerSeverity.Normal;
        } else {
          severity = TimerSeverity.Fast;
        }
        const timerData: timerData = {
          duration: duration,
          severity: severity,
        };

        data.timer = timerData;

        await appendOutput(data);
        return result;
      };
    } else {
      descriptor.value = function (...args: any[]) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const end = performance.now();
        const duration = end - start;
        let severity: TimerSeverity;
        if (duration > normal) {
          severity = TimerSeverity.Slow;
        } else if (duration > fast) {
          severity = TimerSeverity.Normal;
        } else {
          severity = TimerSeverity.Fast;
        }
        const timerData: timerData = {
          duration: duration,
          severity: severity,
        };

        data.timer = timerData;

        appendOutputSync(data);
        return result;
      };
    }
    return descriptor;
  };
};
