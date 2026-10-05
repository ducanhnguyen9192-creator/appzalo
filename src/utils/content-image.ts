const images = import.meta.glob<string>("../assets/**/*.jpg", { query: "?url", import: "default", eager: true });
export function contentImage(url: string) {
  return images[url?.replace(/^\/images\//, "../assets/")] ?? url;
}
