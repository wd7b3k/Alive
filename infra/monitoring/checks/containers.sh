#!/usr/bin/env bash
# Контейнеры Supabase: все ли здоровы и не крутится ли кто-то в петле перезапусков.
source "$(dirname "$0")/../lib/common.sh"

cd "$SUPABASE_DIR" 2>/dev/null || { emit containers "$SUPABASE_DIR" fail - - '{"note":"каталог недоступен"}'; flush_buffer || true; exit 0; }

total=0; bad=0; names=''
while IFS='|' read -r name state health; do
  [[ -z "$name" ]] && continue
  total=$(( total + 1 ))
  if [[ "$state" != "running" ]] || { [[ -n "$health" && "$health" != "healthy" ]]; }; then
    bad=$(( bad + 1 )); names="$names $name"
  fi
done < <(docker compose ps --format '{{.Name}}|{{.State}}|{{.Health}}' 2>/dev/null)

if [[ "$total" -eq 0 ]]; then
  emit containers compose fail - 0 '{"note":"docker compose ps ничего не вернул"}'
elif [[ "$bad" -gt 0 ]]; then
  emit containers compose fail - "$bad" "{\"total\":$total,\"unhealthy\":\"${names# }\"}"
else
  emit containers compose ok - "$total" "{\"total\":$total}"
fi

# Перезапуски. Растущее число — это падение, которое само себя лечит и потому невидимо.
restarts="$(docker inspect --format '{{.Name}} {{.RestartCount}}' \
  $(docker compose ps -q 2>/dev/null) 2>/dev/null | awk '$2 > 3 { print $1 }' | tr '\n' ' ')"
if [[ -n "$restarts" ]]; then
  emit container_restarts - warn - - "{\"containers\":\"${restarts% }\"}"
else
  emit container_restarts - ok - - '{}'
fi

flush_buffer || true
flush_alerts || true
