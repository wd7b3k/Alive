#!/usr/bin/env node
/**
 * Доска работ Habitoff: репозиторий — источник истины, доска — представление.
 *
 * Карточки лежат в docs/board/cards.json. Их двигает не человек мышкой, а
 * коммит: строка `Board: done <id>` в сообщении коммита переводит карточку в
 * «Сделано» и прикрепляет к ней ссылку на этот коммит. Ручные правки на самой
 * доске никуда не деваются: они живут отдельным слоем в docs/board/overrides.json
 * и в самой странице. Порядок целиком — docs/board/README.md, решение — ADR-0012.
 *
 *   node scripts/board.mjs check   — проверить карточки и непринятые трейлеры
 *   node scripts/board.mjs apply   — применить трейлеры Board: из новых коммитов
 *   node scripts/board.mjs build   — собрать страницу доски в dist/board.html
 *   node scripts/board.mjs md      — переписать BACKLOG.md срезом открытого
 *
 * Зависимостей нет намеренно: скрипт обязан работать в CI до `npm ci` и на
 * сервере, где npm-окружения приложения нет.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARDS = path.join(ROOT, "docs/board/cards.json");
const OVERRIDES = path.join(ROOT, "docs/board/overrides.json");
const TEMPLATE = path.join(ROOT, "scripts/board-template.html");
const BACKLOG = path.join(ROOT, "BACKLOG.md");

const STATUSES = ["backlog", "next", "doing", "verify", "done"];
const PRIO = ["P0", "P1", "P2", "P3"];

const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
const readJson = (p, fb) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fb);
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
function fail(msg) {
  console.error("board: " + msg);
  process.exit(1);
}

/* ── трейлеры ───────────────────────────────────────────────────────
 * Board: done inf-users-migration
 * Board: doing inf-observability
 * Board: prio perf-bundle P1
 * Board: note inf-in-repo "ждёт доступа к серверу"
 * Board: doc  inf-in-repo docs/ROLLOUT.md
 * Board: chat inf-in-repo https://claude.ai/...
 * Board: new  bug P1 perf "Каталог запрашивается дважды" :: короткое описание
 * Board: drop own-abc123
 */
const TRAILER = /^\s*Board:\s*(.+?)\s*$/gim;

function parseTrailers(body) {
  const out = [];
  let m;
  TRAILER.lastIndex = 0;
  // Только тело коммита: заголовок вида «board: применены трейлеры» —
  // это описание работы, а не команда доске, и командой считаться не должен.
  const rest = String(body).split("\n").slice(1).join("\n");
  while ((m = TRAILER.exec(rest))) {
    const line = m[1];
    const verb = line.split(/\s+/)[0].toLowerCase();
    out.push({ verb, rest: line.slice(verb.length).trim(), line });
  }
  return out;
}
const quoted = (s) => {
  const m = s.match(/"([^"]+)"|«([^»]+)»/);
  return m ? m[1] || m[2] : null;
};

const TRANSLIT = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
function slug(title, taken) {
  let s = title
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => (TRANSLIT[c] != null ? TRANSLIT[c] : c))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .slice(0, 4)
    .join("-");
  if (!s) s = "card";
  let id = s,
    n = 2;
  while (taken.has(id)) id = s + "-" + n++;
  return id;
}
function touch(card, hash, date) {
  card.updated = date;
  card.commits = card.commits || [];
  if (hash && !card.commits.includes(hash)) card.commits.push(hash);
  if (card.commits.length > 6) card.commits = card.commits.slice(-6);
}

function commitsSince(from) {
  let raw;
  try {
    raw = git("log", "--reverse", "--date=short", "--format=%H%x00%ad%x00%B%x1e", from ? from + "..HEAD" : "-40");
  } catch (e) {
    console.error("board: git log не выполнился — " + e.message);
    return [];
  }
  return raw
    .split("\x1e")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [hash, date, ...body] = s.split("\x00");
      return { hash, date, body: body.join("\x00") };
    });
}

/* ── apply ──────────────────────────────────────────────────────── */
function apply({ dry }) {
  const board = readJson(CARDS, null);
  if (!board) fail("нет docs/board/cards.json");
  const byId = new Map(board.cards.map((c) => [c.id, c]));
  const taken = new Set(byId.keys());
  const log = [];
  let head = board.appliedCommit || "";

  for (const c of commitsSince(board.appliedCommit)) {
    head = c.hash;
    const short = c.hash.slice(0, 7);
    for (const t of parseTrailers(c.body)) {
      if (STATUSES.includes(t.verb)) {
        t.rest
          .split(/[,\s]+/)
          .filter(Boolean)
          .forEach((id) => {
            const card = byId.get(id);
            if (!card) return log.push(`! ${short} нет карточки ${id} (Board: ${t.line})`);
            if (card.status !== t.verb) log.push(`  ${short} ${id}: ${card.status} → ${t.verb}`);
            card.status = t.verb;
            touch(card, c.hash, c.date);
          });
      } else if (t.verb === "new") {
        const title = quoted(t.rest);
        if (!title) {
          log.push(`! ${short} у Board: new нет заголовка в кавычках`);
          continue;
        }
        const words = t.rest.split(/\s+/);
        const type = (board.types.find((x) => x.id === words[0]) || { id: "tech" }).id;
        const pm = t.rest.match(/\bP([0-3])\b/);
        const epic = (board.epics.find((e) => words.includes(e.id)) || { id: "process" }).id;
        const dm = t.rest.split("::")[1];
        const id = slug(title, taken);
        taken.add(id);
        const card = { id, title, type, epic, priority: pm ? +pm[1] : 2, status: "backlog", body: dm ? dm.trim() : "", updated: c.date, commits: [c.hash] };
        board.cards.push(card);
        byId.set(id, card);
        log.push(`+ ${short} новая карточка ${id} (${PRIO[card.priority]} · ${type} · ${epic})`);
      } else if (t.verb === "prio") {
        const [id] = t.rest.split(/\s+/);
        const pm = t.rest.match(/\bP([0-3])\b/);
        const card = byId.get(id);
        if (!card || !pm) {
          log.push(`! ${short} не разобрано: Board: ${t.line}`);
          continue;
        }
        log.push(`  ${short} ${id}: ${PRIO[card.priority]} → P${pm[1]}`);
        card.priority = +pm[1];
        touch(card, c.hash, c.date);
      } else if (t.verb === "note") {
        const [id] = t.rest.split(/\s+/);
        const card = byId.get(id);
        const text = quoted(t.rest);
        if (!card || !text) {
          log.push(`! ${short} не разобрано: Board: ${t.line}`);
          continue;
        }
        card.body = (card.body ? card.body + " " : "") + text;
        touch(card, c.hash, c.date);
        log.push(`  ${short} ${id}: дополнено описание`);
      } else if (t.verb === "doc") {
        const [id, p] = t.rest.split(/\s+/);
        const card = byId.get(id);
        if (!card || !p) {
          log.push(`! ${short} не разобрано: Board: ${t.line}`);
          continue;
        }
        card.docs = card.docs || [];
        if (!card.docs.some((d) => d.path === p)) card.docs.push({ label: path.basename(p), path: p });
        touch(card, c.hash, c.date);
        log.push(`  ${short} ${id}: связан документ ${p}`);
      } else if (t.verb === "chat") {
        const [id, url] = t.rest.split(/\s+/);
        const card = byId.get(id);
        if (!card || !url) {
          log.push(`! ${short} не разобрано: Board: ${t.line}`);
          continue;
        }
        card.chats = card.chats || [];
        if (!card.chats.some((x) => x.url === url)) card.chats.push({ label: "чат " + c.date, slug: "", url });
        touch(card, c.hash, c.date);
        log.push(`  ${short} ${id}: привязан чат`);
      } else if (t.verb === "drop") {
        const [id] = t.rest.split(/\s+/);
        const i = board.cards.findIndex((x) => x.id === id);
        if (i < 0) {
          log.push(`! ${short} нет карточки ${id}`);
          continue;
        }
        board.cards.splice(i, 1);
        byId.delete(id);
        log.push(`− ${short} карточка ${id} удалена`);
      } else {
        log.push(`! ${short} неизвестный глагол: Board: ${t.line}`);
      }
    }
  }
  board.appliedCommit = head || board.appliedCommit;
  board.generated = git("log", "-1", "--date=short", "--format=%ad");
  if (!dry) writeJson(CARDS, board);
  console.log(log.length ? log.join("\n") : "board: трейлеров Board: в новых коммитах нет");
  console.log(`board: ${dry ? "проверка" : "применено"} — карточек ${board.cards.length}, состояние на ${board.appliedCommit.slice(0, 7)}`);
}

/* ── check ──────────────────────────────────────────────────────── */
function check() {
  const board = readJson(CARDS, null);
  if (!board) fail("нет docs/board/cards.json");
  const errors = [],
    warns = [];
  const ids = new Set(),
    epics = new Set(board.epics.map((e) => e.id)),
    types = new Set(board.types.map((t) => t.id));
  board.cards.forEach((c) => {
    if (ids.has(c.id)) errors.push(`повтор id: ${c.id}`);
    ids.add(c.id);
    if (!c.title) errors.push(`${c.id}: нет заголовка`);
    if (!types.has(c.type)) errors.push(`${c.id}: неизвестный тип ${c.type}`);
    if (!epics.has(c.epic)) errors.push(`${c.id}: неизвестный эпик ${c.epic}`);
    if (!STATUSES.includes(c.status)) errors.push(`${c.id}: неизвестная колонка ${c.status}`);
    if (![0, 1, 2, 3].includes(c.priority)) errors.push(`${c.id}: приоритет вне P0–P3`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.updated || "")) errors.push(`${c.id}: нет даты обновления`);
    if (c.status === "done" && !(c.commits || []).length && !(c.docs || []).length && !(c.chats || []).length)
      warns.push(`${c.id}: закрыта, но ни коммита, ни документа, ни чата — по чему её проверить?`);
  });

  // Закрытая карточка без адреса чата. Коммит говорит, что изменилось, но не говорит,
  // почему решили именно так и что при этом отвергли. На 06.09.2026 непустая ссылка была
  // у двух карточек из 224: остальные 133 закрытых работы существуют только результатом.
  // Предупреждение, а не ошибка: у 147 карточек первой сборки 27.08 адресов чатов взять
  // неоткуда, и роняться на истории эта проверка не должна.
  const doneNoChat = board.cards.filter(
    (c) => c.status === "done" && !(c.chats || []).some((ch) => (typeof ch === "string" ? ch : ch && ch.url))
  );
  if (doneNoChat.length)
    warns.push(
      `${doneNoChat.length} закрытых карточек без ссылки на чат — решение восстановить будет неоткуда. ` +
        `Привязка: трейлер Board: chat <id> <url>`
    );

  const news = commitsSince(board.appliedCommit);
  const withTrailer = news.filter((c) => parseTrailers(c.body).length);
  if (withTrailer.length)
    errors.push(
      `в ${withTrailer.length} новых коммитах есть трейлеры Board:, а cards.json стоит на ${(board.appliedCommit || "—").slice(0, 7)}. Выполните: node scripts/board.mjs apply`
    );
  const silent = news.filter((c) => {
    if (parseTrailers(c.body).length) return false;
    try {
      return git("show", "--name-only", "--format=", c.hash)
        .split("\n")
        .some((f) => /^(app|supabase)\//.test(f));
    } catch (e) {
      return false;
    }
  });
  if (silent.length)
    warns.push(
      `${silent.length} коммит(ов) трогают app/ или supabase/ без трейлера Board: — доска о них не узнает: ${silent.map((c) => c.hash.slice(0, 7)).join(" ")}`
    );

  warns.forEach((w) => console.log("board: предупреждение — " + w));
  if (errors.length) {
    errors.forEach((e) => console.error("board: ошибка — " + e));
    process.exit(1);
  }
  console.log(`board: карточек ${board.cards.length}, эпиков ${board.epics.length}, ошибок нет`);
}

/* ── build ──────────────────────────────────────────────────────── */
function build(outArg) {
  const board = readJson(CARDS, null);
  if (!board) fail("нет docs/board/cards.json");
  if (!fs.existsSync(TEMPLATE)) fail("нет scripts/board-template.html");
  const ov = readJson(OVERRIDES, { schema: 2, o: {}, c: [] });
  const safe = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const html = fs
    .readFileSync(TEMPLATE, "utf8")
    .replace("__CARDS_JSON__", () => safe(board))
    .replace("__OVERRIDES_JSON__", () => safe(ov));
  const out = outArg || path.join(ROOT, "dist/board.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  const open = board.cards.filter((c) => c.status !== "done").length;
  console.log(`board: ${out} — карточек ${board.cards.length}, открытых ${open}, ${(html.length / 1024) | 0} КБ`);
}

/* ── md ─────────────────────────────────────────────────────────── */
function md() {
  const board = readJson(CARDS, null);
  if (!board) fail("нет docs/board/cards.json");
  const epic = (id) => (board.epics.find((e) => e.id === id) || { name: id }).name;
  const type = (id) => (board.types.find((t) => t.id === id) || { name: id }).name;
  const col = (id) => (board.columns.find((c) => c.id === id) || { name: id }).name;
  const open = board.cards.filter((c) => c.status !== "done");
  const L = [
    "# Бэклог Habitoff",
    "",
    "Файл собирает `node scripts/board.mjs md` из `docs/board/cards.json`. Руками не редактируется:",
    "карточку двигает трейлер `Board:` в коммите, найденное попутно заводится тем же трейлером.",
    "Та же выборка живой доской — артефакт «Пульт Habitoff», порядок в `docs/board/README.md`.",
    "",
    `Состояние на ${board.generated}, коммит ${(board.appliedCommit || "—").slice(0, 7)}. Открыто ${open.length} из ${board.cards.length}.`,
    "",
  ];
  const blockers = open.filter((c) => (c.tags || []).includes("pilot"));
  if (blockers.length) {
    L.push("## Держит пилот", "");
    blockers.forEach((c) => L.push(`- **${c.title}** — ${col(c.status)}, ${PRIO[c.priority]}, ${epic(c.epic)}`));
    L.push("");
  }
  [0, 1, 2, 3].forEach((p) => {
    const list = open.filter((c) => c.priority === p).sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status));
    if (!list.length) return;
    L.push(`## ${PRIO[p]} — ${list.length}`, "");
    list.forEach((c) => {
      L.push(`- \`${c.id}\` · ${col(c.status)} · ${type(c.type)} · ${epic(c.epic)} — **${c.title}**`);
      if (c.body) L.push(`  ${c.body}`);
    });
    L.push("");
  });
  fs.writeFileSync(BACKLOG, L.join("\n"));
  console.log(`board: BACKLOG.md — открытых ${open.length}`);
}

const [, , cmd, ...rest] = process.argv;
if (cmd === "check") check();
else if (cmd === "apply") apply({ dry: rest.includes("--dry") });
else if (cmd === "build") build(rest.find((a) => !a.startsWith("--")));
else if (cmd === "md") md();
else {
  console.log("node scripts/board.mjs check | apply [--dry] | build [файл] | md");
  process.exit(cmd ? 1 : 0);
}
