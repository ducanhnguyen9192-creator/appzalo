export type Account = { id: string; name: string; email: string; role: "admin" | "customer" };

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function authRequest(path: string, body?: Record<string, string>): Promise<Account | null> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/${path}`, {
      method: body ? "POST" : "GET",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Vui lòng thử lại.");
  }
  if (path === "me" && response.status === 401) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Máy chủ chưa sẵn sàng. Vui lòng thử lại.");
  return data?.user ?? null;
}
