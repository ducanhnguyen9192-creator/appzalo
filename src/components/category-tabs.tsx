import { useAtom, useAtomValue } from "jotai";
import Tabs from "./tabs";
import { selectedTabIndexState, tabsState } from "@/state";

export default function CategoryTabs() {
  const tabs = useAtomValue(tabsState);
  const [selectedIndex, setSelectedIndex] = useAtom(selectedTabIndexState);
  return (
    <Tabs
      items={["Tour hot", "Trong nước", "Nước ngoài"]}
      value={tabs[selectedIndex]}
      onChange={(tab) => setSelectedIndex(tabs.indexOf(tab))}
      renderLabel={(item) => item}
    />
  );
}
