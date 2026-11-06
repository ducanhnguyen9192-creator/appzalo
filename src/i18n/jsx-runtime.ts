// Localize text at the React render boundary; never mutate React-owned DOM nodes.
// Only server-prepared dictionaries are used. Input values and request data stay original.
import { forwardRef } from "react";
import { jsx as reactJsx, jsxs as reactJsxs, Fragment } from "react/jsx-runtime";
import { useLanguage } from "./store";
export { Fragment };
function LocalizedText({ text }: { text: string }) { return useLanguage().t(text); }
const textAttributes = ["title", "placeholder", "alt", "aria-label", "aria-description", "aria-valuetext"];

const LocalizedHost = forwardRef<any, any>(function LocalizedHost({ host, original, ...overrides }, ref) {
  const { t } = useLanguage();
  const props = { ...original, ...overrides, ref };
  if (props.translate !== "no" && !["script", "style", "code", "pre", "textarea"].includes(host)) {
    for (const name of textAttributes) {
      if (typeof props[name] === "string") props[name] = t(props[name]);
    }
    // An option's implicit form value must not change when its label is translated.
    if (host === "option" && props.value === undefined && typeof props.children === "string") props.value = props.children;
    const text = (child: any): any => typeof child === "string" ? t(child) : Array.isArray(child) ? child.map(text) : child;
    props.children = text(props.children);
  }
  return reactJsx(host, props);
});

function localized(factory: typeof reactJsx, type: any, props: any, key?: any) {
  if (typeof type !== "string") {
    // Library components such as NavLink render their own native elements.
    // Text children therefore need their own subscription, without adding a DOM span.
    const localizeChild = (child: any, index = 0): any => typeof child === "string"
      ? reactJsx(LocalizedText, { text: child }, `localized-text-${index}`)
      : Array.isArray(child) ? child.map(localizeChild) : child;
    const localizedProps = props?.children === undefined ? props : { ...props, children: localizeChild(props.children) };
    // Router/library components forward accessible labels to DOM nodes outside
    // this JSX runtime, so translate those attributes before forwarding them.
    if (textAttributes.some(name => typeof props?.[name] === "string")) {
      const { ref, ...original } = localizedProps;
      return reactJsx(LocalizedHost, { host: type, original, ref }, key);
    }
    return factory(type, localizedProps, key);
  }
  const { ref, ...original } = props ?? {};
  return reactJsx(LocalizedHost, { host: type, original, ref }, key);
}
export const jsx = (type: any, props: any, key?: any) => localized(reactJsx, type, props, key);
export const jsxs = (type: any, props: any, key?: any) => localized(reactJsxs, type, props, key);
export type { JSX } from "react/jsx-runtime";
