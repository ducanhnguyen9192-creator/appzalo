const images = import.meta.glob<string>("../assets/**/*.jpg", { query: "?url", import: "default", eager: true });
export function contentImage(url: string) {
  if (url?.startsWith("/api/media/")) return `${(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")}${url}`;
  return images[url?.replace(/^\/images\//, "../assets/")] ?? url;
}
