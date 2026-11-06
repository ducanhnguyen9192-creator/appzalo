import { useEffect } from "react";
import { setTranslatedPageTitle } from "@/i18n/store";

export function usePageTitle(title?: string) {
  useEffect(() => {
    if (title) setTranslatedPageTitle(title);
  }, [title]);
}
