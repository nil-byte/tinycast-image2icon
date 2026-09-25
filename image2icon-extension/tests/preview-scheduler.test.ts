import { describe, expect, it, vi } from "vitest";
import { PreviewScheduler } from "../src/preview-scheduler";

describe("PreviewScheduler", () => {
  it("coalesces pending work and publishes only the newest revision", async () => {
    vi.useFakeTimers();
    const resolvers: Array<(value: string) => void> = [];
    const execute = vi.fn(
      (value: string) =>
        new Promise<string>((resolve) => {
          resolvers.push(() => resolve(value));
        }),
    );
    const results: string[] = [];
    const scheduler = new PreviewScheduler(
      execute,
      { onResult: (value) => results.push(value), onError: vi.fn() },
      10,
    );

    scheduler.request("first");
    await vi.advanceTimersByTimeAsync(10);
    scheduler.request("second");
    scheduler.request("latest");
    resolvers[0]("first");
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenLastCalledWith("latest");
    resolvers[1]("latest");
    await Promise.resolve();
    expect(results).toEqual(["latest"]);
    vi.useRealTimers();
  });

  it("keeps the last zoom after twenty changes while an older render runs", async () => {
    vi.useFakeTimers();
    try {
      let finishFirst!: (value: string) => void;
      const execute = vi.fn((value: string) =>
        value === "zoom=1"
          ? new Promise<string>((resolve) => {
              finishFirst = resolve;
            })
          : Promise.resolve(value),
      );
      const onResult = vi.fn();
      const scheduler = new PreviewScheduler(
        execute,
        { onResult, onError: vi.fn() },
        0,
      );
      scheduler.request("zoom=1");
      await vi.advanceTimersByTimeAsync(0);
      for (let zoom = 105; zoom <= 200; zoom += 5) {
        scheduler.request(`zoom=${zoom / 100}`);
      }
      finishFirst("zoom=1");
      await vi.advanceTimersByTimeAsync(0);
      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute).toHaveBeenLastCalledWith("zoom=2");
      expect(onResult).toHaveBeenCalledExactlyOnceWith("zoom=2", "zoom=2");
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores a result after invalidation", async () => {
    vi.useFakeTimers();
    let resolve!: (value: string) => void;
    const onResult = vi.fn();
    const scheduler = new PreviewScheduler(
      () => new Promise<string>((next) => (resolve = next)),
      { onResult, onError: vi.fn() },
      1,
    );
    scheduler.request("request");
    await vi.advanceTimersByTimeAsync(1);
    scheduler.invalidate();
    resolve("late");
    await Promise.resolve();
    expect(onResult).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
