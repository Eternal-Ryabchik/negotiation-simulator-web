// Сборка под GitHub Pages и публикация dist/ в ветку gh-pages
import { execSync } from "node:child_process";
import { copyFileSync, rmSync, writeFileSync } from "node:fs";

const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });
const remote = execSync("git remote get-url origin").toString().trim();
const repo = remote.split("/").pop().replace(/\.git$/, "");

run("npm run build", { env: { ...process.env, BASE_PATH: `/${repo}/` } });
copyFileSync("dist/index.html", "dist/404.html"); // SPA-фолбэк
writeFileSync("dist/.nojekyll", "");

const git = (cmd) => run(`git ${cmd}`, { cwd: "dist" });
const cfg = (key) => execSync(`git config ${key}`).toString().trim();
rmSync("dist/.git", { recursive: true, force: true });
git("init -q -b gh-pages");
git(`config user.name "${cfg("user.name")}"`);
git(`config user.email "${cfg("user.email")}"`);
git("add -A");
git('commit -q -m "Deploy to GitHub Pages"');
// Пушим из основного репозитория, чтобы работали его настройки (SSH-ключ и т.п.)
run("git fetch -q dist gh-pages");
run("git push -f origin FETCH_HEAD:refs/heads/gh-pages");
