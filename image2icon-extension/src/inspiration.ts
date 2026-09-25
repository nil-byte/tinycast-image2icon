import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "image2icon.inspiration.v1";
const ENDPOINT =
  "https://v1.hitokoto.cn/?c=d&c=i&c=k&max_length=38&encode=json";

export type Inspiration = {
  text: string;
  attribution: string;
  url?: string;
};

type CachedInspiration = Inspiration & { date: string };

type StorageAdapter = {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<void>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const FALLBACKS: Inspiration[] = [
  { text: "行到水穷处，坐看云起时。", attribution: "王维《终南别业》" },
  { text: "山重水复疑无路，柳暗花明又一村。", attribution: "陆游《游山西村》" },
  { text: "海内存知己，天涯若比邻。", attribution: "王勃《送杜少府之任蜀州》" },
  { text: "长风破浪会有时，直挂云帆济沧海。", attribution: "李白《行路难》" },
];

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fallbackInspiration(date = new Date()): Inspiration {
  const seed = Number(localDateKey(date).replaceAll("-", ""));
  return FALLBACKS[seed % FALLBACKS.length];
}

export async function loadDailyInspiration({
  date = new Date(),
  storage = LocalStorage,
  fetcher = fetch,
}: {
  date?: Date;
  storage?: StorageAdapter;
  fetcher?: FetchLike;
} = {}): Promise<Inspiration> {
  const dateKey = localDateKey(date);
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (typeof raw === "string") {
      const cached = JSON.parse(raw) as CachedInspiration;
      if (cached.date === dateKey && isInspiration(cached)) {
        return {
          text: cached.text,
          attribution: cached.attribution,
          ...(cached.url ? { url: cached.url } : {}),
        };
      }
    }
  } catch {
    // A damaged cache must not prevent the preview from loading.
  }

  try {
    const inspiration = await fetchRemoteInspiration(fetcher);
    await saveCached(storage, dateKey, inspiration);
    return inspiration;
  } catch {
    const fallback = fallbackInspiration(date);
    try {
      await saveCached(storage, dateKey, fallback);
    } catch {
      // The in-memory fallback is sufficient when storage is unavailable.
    }
    return fallback;
  }
}

export async function refreshInspiration({
  date = new Date(),
  storage = LocalStorage,
  fetcher = fetch,
}: {
  date?: Date;
  storage?: StorageAdapter;
  fetcher?: FetchLike;
} = {}): Promise<Inspiration> {
  const inspiration = await fetchRemoteInspiration(fetcher);
  await saveCached(storage, localDateKey(date), inspiration);
  return inspiration;
}

export async function fetchRemoteInspiration(
  fetcher: FetchLike = fetch,
): Promise<Inspiration> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetcher(ENDPOINT, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("短句服务暂时不可用");
    const value = (await response.json()) as Record<string, unknown>;
    return parseHitokoto(value);
  } finally {
    clearTimeout(timeout);
  }
}

export function markdownForInspiration(inspiration: Inspiration): string {
  const text = escapeMarkdown(inspiration.text);
  const attribution = escapeMarkdown(inspiration.attribution);
  const source = inspiration.url
    ? `[${attribution}](${inspiration.url})`
    : attribution;
  return `> ${text}\n\n— ${source}`;
}

function parseHitokoto(value: Record<string, unknown>): Inspiration {
  const text = normalizedText(value.hitokoto);
  const uuid = normalizedText(value.uuid);
  const type = normalizedText(value.type);
  if (
    !text ||
    Array.from(text).length > 38 ||
    !uuid ||
    !["d", "i", "k"].includes(type)
  ) {
    throw new Error("短句响应无效");
  }
  const from = normalizedText(value.from);
  const author = normalizedText(value.from_who);
  const attribution = [author, from].filter(Boolean).join(" · ") || "一言";
  if (Array.from(attribution).length > 60) throw new Error("短句出处过长");
  return {
    text,
    attribution,
    url: `https://hitokoto.cn/?uuid=${encodeURIComponent(uuid)}`,
  };
}

function normalizedText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function isInspiration(value: unknown): value is Inspiration {
  const item = value as Partial<Inspiration>;
  return (
    typeof item?.text === "string" &&
    item.text.length > 0 &&
    typeof item.attribution === "string" &&
    item.attribution.length > 0 &&
    (item.url === undefined || typeof item.url === "string")
  );
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]()]/g, "\\$&");
}

async function saveCached(
  storage: StorageAdapter,
  date: string,
  inspiration: Inspiration,
): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify({ date, ...inspiration }));
}
