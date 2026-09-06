#!/usr/bin/env bash
# Снимок состояния репозитория одной командой.
#
# Сессия начинается не с описания состояния по памяти, а с этого вывода: карта
# в голове расходится с git. 27.08.2026 постановка предполагала четыре слияния,
# а `git merge-base --is-ancestor` показал, что три из них уже внутри четвёртого.
# Вывод целиком вставляется в первый промпт сессии — целиком, не пересказом.
set -uo pipefail
cd "$(dirname "$0")/.."

# --- Первым делом: от чего работает сессия -------------------------------------------
#
# Локальный `main` 06.09.2026 отставал от `origin/main` на 121 коммит, и из-за этого
# двенадцать файлов на диске выглядели невыложенной работой, хотя были удалены неделю
# назад. Отставший `main` не виден ни в одной другой строке этого вывода: ветка чистая,
# доска зелёная, прод совпадает. Поэтому строка стоит первой и говорит «стоп» вслух.
echo "=== ОТ ЧЕГО РАБОТАЕМ ==="
git fetch --quiet origin 2>/dev/null || echo "fetch не прошёл — числа ниже могут быть старыми"
behind="$(git rev-list --count main..origin/main 2>/dev/null || echo '?')"
if [ "$behind" = "0" ]; then
  echo "локальный main совпадает с origin/main"
elif [ "$behind" = "?" ]; then
  echo "СТОП: не удалось сравнить main с origin/main. Ветки main нет или нет связи с origin."
else
  echo "СТОП: локальный main отстаёт от origin/main на $behind коммит(ов)."
  echo "  Новую ветку от него заводить нельзя, а untracked-файл на диске может оказаться"
  echo "  не невыложенной работой, а остатком удаления, которое не доехало до диска."
  echo "  Сначала: git pull --ff-only"
fi

echo
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
echo "=== ПОСТАНОВКА ВНЕ GIT ==="
# Untracked `.md` в docs/ — это либо постановка, которой для всех остальных сессий не
# существует, либо остаток удаления, не доехавшего до диска. Раздел «незакоммиченное»
# выше показывает их вперемешку с правками; здесь они названы отдельно, потому что цена
# у них разная. Различает одна команда, она и напечатана.
untracked_docs="$(git ls-files --others --exclude-standard -- docs/ '*.md' 2>/dev/null | sort -u)"
if [ -z "$untracked_docs" ]; then
  echo "нет: все документы и постановки в git"
else
  echo "$untracked_docs" | while read -r f; do
    [ -n "$f" ] || continue
    if [ -n "$(git log --all --diff-filter=D --format='%h' -1 -- "$f" 2>/dev/null)" ]; then
      echo "  ОСТАТОК УДАЛЕНИЯ: $f — файл был снят коммитом, а на диске остался"
    else
      echo "  вне git: $f"
    fi
  done
  echo "  Проверка: git log --all --diff-filter=D -- <путь>"
fi

echo
echo "=== ЧИСЛА В ДОКУМЕНТАХ ==="
node scripts/check-numbers.mjs 2>&1 || true

echo
echo "=== ПРЕДЕЛЫ ==="
node scripts/check-limits.mjs --warn 2>&1 || true

echo
echo "=== ЛОКАЛЬНОЕ ⇄ ORIGIN ==="
node scripts/check-local-drift.mjs 2>&1 || true

echo
echo "=== ДОСТУПЫ ==="
if GIT_TERMINAL_PROMPT=0 timeout 15 git push --dry-run origin HEAD >/dev/null 2>&1; then echo "push: есть"; else echo "push: НЕТ — задачу, требующую доставки в origin, не брать"; fi
if command -v gh >/dev/null 2>&1; then echo "gh: есть"; else echo "gh: нет"; fi
if curl -fsS -m 5 -o /dev/null https://habitoff.ru/version.json 2>/dev/null; then echo "прод из этого контура: доступен"; else echo "прод из этого контура: НЕТ — вывод о состоянии прода делать нельзя"; fi
if [ -n "${HABITOFF_SSH:-}" ] && timeout 8 ssh -o BatchMode=yes -o ConnectTimeout=5 "$HABITOFF_SSH" true 2>/dev/null; then echo "ssh VPS: есть"; else echo "ssh VPS: нет или HABITOFF_SSH не задан"; fi
