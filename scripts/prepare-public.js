const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const files = [
  "project-index.html",
  "dashboard.html",
  "chat.html",
  "records.html",
  "transfer.html",
  "knowledge.html",
  "feedback.html",
  "test-supabase.html",
];

const dirs = ["css", "js"];

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const file of files) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(publicDir, file));
  }
}

for (const dir of dirs) {
  const src = path.join(root, dir);
  const dest = path.join(publicDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

console.log("Prepared static assets in public/");
