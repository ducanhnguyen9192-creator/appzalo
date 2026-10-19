import { useAtomValue, useSetAtom } from "jotai";
import { articlesResultState, articlesRevisionState } from "@/state";

export default function ArticlesError() {
  const { error } = useAtomValue(articlesResultState);
  const retry = useSetAtom(articlesRevisionState);
  if (!error) return null;
  return <div role="alert" className="p-4 text-sm text-red-700">Chưa tải được tin tức. Kiểm tra kết nối rồi thử lại. <button type="button" className="underline py-2" onClick={() => retry(value => value + 1)}>Tải lại tin tức</button></div>;
}
