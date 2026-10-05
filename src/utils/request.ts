import { getConfig } from "./template";

const API_URL = getConfig((config) => config.template.apiUrl);

const mockUrls = import.meta.glob<{ default: string }>("../mock/*.json", {
  query: "url",
  eager: true,
});

export async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const contentPath = ["/products", "/banners"].includes(path);
  const backendUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  const url = contentPath
    ? `${backendUrl}/api/content${path}`
    : API_URL
    ? `${API_URL}${path}`
    : mockUrls[`../mock${path}.json`]?.default;

  if (!API_URL && !contentPath) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status}).`);
  return response.json() as T;
}

export async function requestWithFallback<T>(
  path: string,
  fallbackValue: T,
  options?: RequestInit
): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    console.warn(
      "An error occurred while fetching data. Falling back to default value!"
    );
    console.warn({ path, error, fallbackValue });
    return fallbackValue;
  }
}
