export const adminApiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function adminApi<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${adminApiBase}/api/admin/${path}`, { credentials: "include", method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Không thể kết nối máy chủ quản trị.");
  return data;
}
