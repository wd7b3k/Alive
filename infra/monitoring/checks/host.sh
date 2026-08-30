#!/usr/bin/env bash
# Хост: место, память, swap. Диск кончается тихо и убивает базу первой.
source "$(dirname "$0")/../lib/common.sh"

check_disk() {
  local mount="$1" name="$2"
  local pct inodes
  pct="$(df -P "$mount" | awk 'NR==2 { gsub("%","",$5); print $5 }')"
  inodes="$(df -Pi "$mount" | awk 'NR==2 { gsub("%","",$5); print $5 }')"
  local st=ok
  [[ "$pct" -ge 80 || "$inodes" -ge 80 ]] && st=warn
  [[ "$pct" -ge 90 || "$inodes" -ge 90 ]] && st=fail
  emit "$name" "$mount" "$st" - "$pct" "{\"inodes_pct\":$inodes}"
}

check_disk / host_disk_root
[[ -d "$SUPABASE_DIR/volumes/db/data" ]] && check_disk "$SUPABASE_DIR/volumes/db/data" host_disk_db

read -r memtotal memavail swaptotal swapfree <<< "$(awk '
  /^MemTotal:/ {mt=$2} /^MemAvailable:/ {ma=$2}
  /^SwapTotal:/ {st=$2} /^SwapFree:/ {sf=$2}
  END { print mt, ma, st, sf }' /proc/meminfo)"

mem_used_pct=$(( (memtotal - memavail) * 100 / memtotal ))
st=ok; [[ "$mem_used_pct" -ge 85 ]] && st=warn; [[ "$mem_used_pct" -ge 95 ]] && st=fail
emit host_memory - "$st" - "$mem_used_pct" '{}'

# Swap в деле на сервере с базой — это уже деградация, даже когда всё «работает».
if [[ "$swaptotal" -gt 0 ]]; then
  swap_used_pct=$(( (swaptotal - swapfree) * 100 / swaptotal ))
  st=ok; [[ "$swap_used_pct" -ge 25 ]] && st=warn; [[ "$swap_used_pct" -ge 60 ]] && st=fail
  emit host_swap - "$st" - "$swap_used_pct" '{}'
fi

load="$(awk '{ print $1 }' /proc/loadavg)"
cores="$(nproc)"
st=ok
awk -v l="$load" -v c="$cores" 'BEGIN { exit !(l > c * 2) }' && st=warn
awk -v l="$load" -v c="$cores" 'BEGIN { exit !(l > c * 4) }' && st=fail
emit host_load - "$st" - "$load" "{\"cores\":$cores}"

flush_buffer || true
flush_alerts || true
