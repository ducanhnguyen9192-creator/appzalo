import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
const traverse = traverseModule.default;
const phrases = new Set();
const vietnamese = /[À-ỹĐđ]/u;
const templates = new Set();
function add(value) {
  const text = value.trim();
  if (text && vietnamese.test(text) && !text.includes("SELECT ") && !text.includes("CREATE TABLE")) phrases.add(text);
}
function visit(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) { if (entry.name !== "i18n") visit(path); continue; }
    if (!/\.(tsx?|mjs)$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
    // Backend validation/error strings only: never read .env, database, or runtime files.
    if (folder.endsWith("backend") && !["server.mjs", "customer-account.mjs", "flight-search.mjs", "translations.mjs"].includes(entry.name)) continue;
    const ast = parse(readFileSync(path, "utf8"), { sourceType: "module", plugins: ["typescript", "jsx", "importAttributes"] });
    traverse(ast, {
      StringLiteral({ node }) { add(node.value); },
      JSXText({ node }) { add(node.value.replace(/\s+/g, " ")); },
      TemplateElement({ node }) { add(node.value.cooked ?? node.value.raw); },
      'TemplateLiteral|BinaryExpression'({ node }) {
        if (node.type === "BinaryExpression" && node.operator !== "+") return;
        let index = 0;
        function pattern(part) {
          if (part.type === "StringLiteral") return part.value;
          if (part.type === "TemplateLiteral") return part.quasis.map((q, i) => (q.value.cooked ?? q.value.raw) + (i < part.expressions.length ? `__FCVAR${index++}__` : "")).join("");
          if (part.type === "BinaryExpression" && part.operator === "+") return pattern(part.left) + pattern(part.right);
          return `__FCVAR${index++}__`;
        }
        const value = pattern(node);
        if (index && vietnamese.test(value)) { add(value); templates.add(value.trim()); }
      },
    });
  }
}
visit(resolve("src"));
visit(resolve("backend"));
function jsonStrings(value) {
  if (typeof value === "string") add(value);
  else if (value && typeof value === "object") Object.values(value).forEach(jsonStrings);
}
for (const file of ["src/mock/categories.json", "src/mock/products.json", "src/pages/esims/destinations.json"]) jsonStrings(JSON.parse(readFileSync(file, "utf8")));
const output = resolve("src/i18n/catalog.json");
writeFileSync(output, JSON.stringify([...phrases].sort(), null, 2) + "\n");
writeFileSync("src/i18n/templates.json", JSON.stringify([...templates].sort(), null, 2) + "\n");
console.log(`${phrases.size} source phrases -> ${relative(process.cwd(), output)}`);
