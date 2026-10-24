import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src/app", "src/components"];
const rules = [
  {
    name: "Telugu-script text",
    pattern: /[\u0C00-\u0C7F]/,
  },
  {
    name: "Unrelated marketplace brand",
    pattern: /\b(?:amazon|flipkart|myntra|meesho|ajio|nykaa)\b/i,
  },
  {
    name: "AI-generation credit",
    pattern: /\b(?:chatgpt|ai[- ]?generated|ai[- ]?powered|made with ai)\b/i,
  },
  {
    name: "Mixed-language storefront/admin instruction",
    pattern: /\b(?:cheyyandi|cheyandi|cheyyali|chestaru|chesi|cheste|chesthe|cheyochu|avtayi|avvali|avutayi|undali|matrame|taruvata|tarvata|ikkada|kosam|nunchi|kavali|kanipistayi|aipoy|avtund|ledhu|paina|ki|lo|ga|ni|tho|unte|batti|ayyayi|kuda|unna|undi|mundu|inka|chestundi|vastayi|chesaka|avtundi|cheyyachu|avvakunda|kanipistundi|ayyaka|padina)\b/i,
  },
  {
    name: "Unfinished placeholder copy",
    pattern: /\b(?:lorem ipsum|subcategories coming soon|dummy customer review)\b/i,
  },
];

const matches = [];
let checked = 0;

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      checked += 1;
      const relative = path.relative(root, fullPath);
      const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
      for (const [index, line] of lines.entries()) {
        for (const rule of rules) {
          if (rule.pattern.test(line)) {
            matches.push(`${relative}:${index + 1}: ${rule.name}: ${line.trim().slice(0, 160)}`);
          }
        }
      }
    }
  }
}

scanRoots.forEach((dir) => scanDirectory(path.join(root, dir)));

if (matches.length > 0) {
  console.error("AS FASHIONS brand copy check failed:");
  matches.forEach((message) => console.error(" - " + message));
  process.exitCode = 1;
} else {
  console.log(`AS FASHIONS brand copy check passed (${checked} storefront and admin files).`);
}
