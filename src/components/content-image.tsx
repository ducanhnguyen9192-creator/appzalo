import { ImgHTMLAttributes, useState } from "react";
import { contentImage } from "@/utils/content-image";
import placeholder from "@/static/content-placeholder.svg";

export default function ContentImage({ src, alt = "", loading = "lazy", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const resolved = contentImage(src ?? "");
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = !resolved || failedSource === resolved;
  return <img {...props} src={failed ? placeholder : resolved} alt={failed ? `Ảnh minh họa chưa có: ${alt}` : alt}
    loading={loading} decoding="async" onError={failed ? undefined : () => setFailedSource(resolved)} />;
}
