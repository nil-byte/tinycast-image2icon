import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fallbackInspiration,
  fetchRemoteInspiration,
  loadDailyInspiration,
  markdownForInspiration,
  refreshInspiration,
} from "../src/inspiration";
import { storage } from "./raycast-api.mock";

const date = new Date(2026, 8, 24, 12);

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const validPayload = {
  uuid: "da7e0460-76b9-44d4-b99e-ccb435b8190c",
  hitokoto: "行到水穷处，坐看云起时。",
  type: "i",
  from: "终南别业",
  from_who: "王维",
};

describe("daily inspiration", () => {
  beforeEach(() => storage.clear());

  it("fetches once per local day and reuses the cached quote", async () => {
    const fetcher = vi.fn(async () => response(validPayload));
    const first = await loadDailyInspiration({ date, fetcher });
    const second = await loadDailyInspiration({ date, fetcher });

    expect(first).toEqual(second);
    expect(first.url).toContain(validPayload.uuid);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain("c=d&c=i&c=k");
  });

  it("shows and caches a public-domain fallback for malformed responses", async () => {
    const fetcher = vi.fn(async () => response({ hitokoto: "missing fields" }));
    const first = await loadDailyInspiration({ date, fetcher });
    const second = await loadDailyInspiration({ date, fetcher });

    expect(first).toEqual(fallbackInspiration(date));
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid manual refresh without replacing the current quote", async () => {
    const fetcher = vi.fn(async () => response({ ...validPayload, type: "h" }));
    await expect(refreshInspiration({ date, fetcher })).rejects.toThrow(
      "短句响应无效",
    );
  });

  it("falls back on a network timeout without blocking indefinitely", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      );
      const pending = loadDailyInspiration({ date, fetcher });
      await vi.advanceTimersByTimeAsync(2_000);
      expect(await pending).toEqual(fallbackInspiration(date));
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("validates length and formats safe linked markdown", async () => {
    await expect(
      fetchRemoteInspiration(async () =>
        response({ ...validPayload, hitokoto: "字".repeat(39) }),
      ),
    ).rejects.toThrow("短句响应无效");

    const markdown = markdownForInspiration({
      text: "一句 [测试]",
      attribution: "作者 (出处)",
      url: "https://example.com",
    });
    expect(markdown).toContain("一句 \\[测试\\]");
    expect(markdown).toContain("[作者 \\(出处\\)](https://example.com)");
  });
});
