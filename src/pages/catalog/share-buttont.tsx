import { useState } from "react";
import { useHref } from "react-router-dom";
import { Product } from "@/types";
import { openShareSheet } from "zmp-sdk";
import CopyButton from "@/components/copy-button";

export default function ShareButton({ product }: { product: Product }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const href = useHref(`/product/${product.id}`);
  const link = new URL(href, window.location.origin).href;
  const inZalo = /Zalo/i.test(navigator.userAgent);
  async function share() {
    if (busy) return;
    setBusy(true); setFailed(false);
    try { await openShareSheet({ type: "zmp_deep_link", data: { title: product.name, thumbnail: product.image, path: `/product/${product.id}` } }); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  }
  return <section aria-label="Chia sẻ bài viết" className="space-y-3">
    {inZalo && <button type="button" disabled={busy} onClick={share} className="rounded-xl bg-blue-600 text-white px-5 py-3 font-medium disabled:opacity-50">{busy ? "Đang mở chia sẻ…" : "Chia sẻ bài viết trên Zalo"}</button>}
    {failed && <p role="status" className="text-sm text-gray-600">Chưa mở được chia sẻ. Bạn có thể sao chép đường dẫn bên dưới.</p>}
    {(!inZalo || failed) && <CopyButton key={link} text={link} label="Sao chép link bài viết" />}
  </section>;
}
