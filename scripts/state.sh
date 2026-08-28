#!/usr/bin/env bash
# Снимок состояния репозитория одной командой.
#
# Сессия начинается не с описания состояния по памяти, а с этого вывода: карта
# в голове расходится с git. 27.08.2026 постановка предполагала четыре слияния,
# а `git merge-base --is-ancestor` показал, что три из них уже внутри четвёртого.
# Вывод целиком вставляется в первый промпт сессии — целиком, не пересказом.
set -uo pipefail
cd "$(dirname "$0")/.."

echo "=== ВЕТКА И ЧИСТОТА ==="
git rev-parse --abbrev-ref HEAD
git log -1 --date=short --format='%h %ad %s'
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "--- незакоммиченное ---"; echo "$dirty"; else echo "рабочее дерево чистое"; fi

echo
echo "=== ТОПОЛОГИЯ ==="
git log --graph --oneline --all -20

echo
echo "=== ВЕТКИ ОТНОСИТЕЛЬНО main ==="
for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | grep -v -E '^(origin/)?(HEAD|main)$'); do
  if git merge-base --is-ancestor "$b" main 2>/dev/null; then
    echo "влита в main: $b"
  else
    ahead="$(git rev-list --count main.."$b" 2>/dev/null || echo '?')"
    echo "НЕ влита ($ahead коммитов впереди): $b"
  fi
done

echo
echo "=== МИГРАЦИИ ==="
echo "файлов в репозитории: $(ls supabase/migrations/*.sql 2>/dev/null | wc -l)"
echo "в базе — сверяет deploy.sh на сервере (число строк в supabase_migrations.schema_migrations)"

echo
echo "=== ПРОД ==="
node scripts/check-deploy-drift.mjs 2>&1 || true

echo
echo "=== ДОСКА ==="
node scripts/board.mjs check 2>&1 || true

echo
echo "=== ДОСТУПЫ (заполнить руками в промпте) ==="
echo "push — ? · gh — ? · ssh VPS — ? · браузер — ?"
