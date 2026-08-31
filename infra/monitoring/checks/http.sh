#!/usr/bin/env bash
# Внешний вид сайта: что видит человек, открывший habitoff.ru.
source "$(dirname "$0")/../lib/common.sh"

read -r code ttfb <<< "$(http_probe "$HABITOFF_ORIGIN/")"
if [[ "$code" == "200" ]]; then
  emit apex_http "$HABITOFF_ORIGIN/" ok "$(ms "$ttfb")" - '{}'
else
  emit apex_http "$HABITOFF_ORIGIN/" fail "$(ms "$ttfb")" - "{\"code\":\"$code\"}"
fi

# www обязан отдавать 301 на apex. Молча начавший работать www — это две копии сайта
# в индексе поисковика и разъехавшаяся статистика.
www="${HABITOFF_ORIGIN/https:\/\//https://www.}"
read -r wcode _ <<< "$(http_probe "$www/")"
if [[ "$wcode" == "301" ]]; then
  emit www_redirect "$www/" ok - - '{}'
else
  emit www_redirect "$www/" fail - - "{\"code\":\"$wcode\"}"
fi

# Отпечаток живой сборки: та ли это версия и целая ли она.
#
# До 30.08.2026 здесь сравнивались два прочтения одного и того же файла: `version.json`
# лежит внутри бандла в каталоге `current`, который отдаёт веб-сервер. Проверка не могла
# не совпасть и три дня рапортовала `ok`, пока прод отставал от `main` на три коммита.
# Что она делает теперь и почему именно так — в `lib/fingerprint.sh`.
source "$(dirname "$0")/../lib/fingerprint.sh"
IFS=$'\t' read -r fp_status fp_detail <<< "$(build_fingerprint_probe)"
emit build_fingerprint "$HABITOFF_ORIGIN/version.json" "$fp_status" - - "$fp_detail"

flush_buffer || true
flush_alerts || true
