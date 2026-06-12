const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDirectory = path.resolve(__dirname, "..");
const checkedDirectories = ["src", "scripts"];
const files = [path.join(rootDirectory, "index.js")];

function collectJavaScriptFiles(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collectJavaScriptFiles(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }
}

for (const directory of checkedDirectories) {
  collectJavaScriptFiles(path.join(rootDirectory, directory));
}

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
}

console.log(`Sintaxe validada em ${files.length} arquivos JavaScript.`);
