import seeds from "../src/i18n/seeds.json" with { type: "json" };
if (Object.keys(seeds).join() !== "en") throw new Error("Only English translations are supported");
console.log(`${Object.keys(seeds.en).length} saved English translations`);
