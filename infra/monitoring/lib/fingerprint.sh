#!/usr/bin/env bash
# Отпечаток живой сборки: та ли это сборка, которая должна отдаваться.
#
# Что здесь было до 30.08.2026. Проверка брала `commit` из
# `https://habitoff.ru/version.json` и сравнивала с `commit` из
# `$APP_DIR/current/version.json`. Но `version.json` создаётся плагином сборки внутри
# бандла и лежит в том же каталоге `current`, который отдаёт веб-сервер: живое значение
# и «дисковое» — это один и тот же файл, прочитанный двумя способами. Сравнение файла
# с самим собой не могло не совпасть. Проверка умела упасть ровно в одном случае —
# если `version.json` не отдаётся совсем, — и рапортовала `ok`, пока прод три дня
# отставал от `main`.
#
# Честная версия отвечает на два разных вопроса.
#
# 1. **Та ли это версия.** Коммит живой сборки сравнивается с `origin/main`, а не с
#    самим собой. Логика не переписана заново: её выполняет
#    `scripts/check-deploy-drift.mjs` — тот же скрипт, которым сверяются руками.
#
# 2. **Целая ли это сборка.** Имя JS-чанка из отданного `index.html` сверяется с тем,
#    что лежит в каталоге `current`. Имя чанка содержит хэш содержимого, поэтому
#    расхождение означает, что отдаётся не тот бандл, который лежит на диске:
#    оборванная выкладка, подменённый файл, кеш, переживший переключение симлинка.
#
# Файл можно запустить напрямую — он напечатает статус и подробности и ничего не
# запишет ни в базу, ни в очередь алертов. Это нужно, чтобы проверку можно было
# проверить: мониторинг, который никогда не срабатывал, — это предположение.
#
#   APP_DIR=/tmp/подменённая-сборка infra/monitoring/lib/fingerprint.sh

# Обновить ссылки репозитория — от имени владельца каталога.
#
# Проверки systemd работают от root, а `/srv/alive/repo` принадлежит `alive`. `git fetch`
# от root оставил бы в `.git` объекты и файлы с чужим владельцем, и следующая выкладка
# упала бы на `git pull` с отказом в доступе — мониторинг сломал бы то, за чем следит.
fingerprint_fetch_ref() {
  local owner
  owner="$(stat -c %U "$REPO_DIR" 2>/dev/null || echo '')"
  if [[ -z "$owner" ]]; then
    return 1
  elif [[ "$owner" == "$(id -un)" ]]; then
    git -C "$REPO_DIR" fetch --quiet origin main 2>/dev/null
  else
    runuser -u "$owner" -- git -C "$REPO_DIR" fetch --quiet origin main 2>/dev/null
  fi
}

# Имя entry-чанка из HTML: <script type="module" src="/assets/index-XXXX.js">.
fingerprint_chunk_of() {
  sed -n 's|.*src="/assets/\(index-[A-Za-z0-9_-]*\.js\)".*|\1|p' <<<"$1" | head -n 1
}

# Печатает: <статус ok|fail><TAB><detail json>
build_fingerprint_probe() {
  local live_html live_chunk disk_chunk drift drift_rc

  live_html="$(curl -sS --max-time "$CURL_TIMEOUT" "$HABITOFF_ORIGIN/" 2>/dev/null || true)"
  if [[ -z "$live_html" ]]; then
    printf 'fail\t{"note":"главная не отдаётся"}\n'
    return 0
  fi

  live_chunk="$(fingerprint_chunk_of "$live_html")"
  if [[ -z "$live_chunk" ]]; then
    printf 'fail\t{"note":"в отданном index.html нет ссылки на entry-чанк"}\n'
    return 0
  fi

  disk_chunk=""
  shopt -s nullglob
  local candidates=("$APP_DIR"/current/assets/index-*.js)
  shopt -u nullglob
  if [[ "${#candidates[@]}" -eq 1 ]]; then
    disk_chunk="$(basename "${candidates[0]}")"
  elif [[ "${#candidates[@]}" -eq 0 ]]; then
    printf 'fail\t{"note":"в current/assets нет entry-чанка","live":"%s"}\n' "$live_chunk"
    return 0
  else
    # Двух entry-чанков в сборке не бывает: значит в каталог что-то доложили руками.
    printf 'fail\t{"note":"в current/assets больше одного entry-чанка","live":"%s","disk":%s}\n' \
      "$live_chunk" "${#candidates[@]}"
    return 0
  fi

  if [[ "$live_chunk" != "$disk_chunk" ]]; then
    printf 'fail\t{"note":"отдаётся не тот бандл, что лежит в current","live":"%s","disk":"%s"}\n' \
      "$live_chunk" "$disk_chunk"
    return 0
  fi

  # -e, а не -d: в рабочем дереве git (git worktree) `.git` — файл со ссылкой, и это
  # такой же полноценный репозиторий.
  if [[ ! -e "$REPO_DIR/.git" ]]; then
    printf 'fail\t{"note":"нет репозитория для сверки с origin/main","repo":"%s"}\n' "$REPO_DIR"
    return 0
  fi
  fingerprint_fetch_ref || true
  # Скрипт сверки не тянет ссылки сам: их уже обновил владелец репозитория выше.
  # safe.directory — потому что проверка идёт от root в чужом каталоге.
  # Присваивание обёрнуто в && / ||: при set -e присваивание из неуспешной подстановки
  # уронило бы всю проверку, а её задача — поймать неуспех и рассказать о нём, а не
  # умереть вместе с ним.
  drift="$(cd "$REPO_DIR" && DRIFT_NO_FETCH=1 \
    GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0="$REPO_DIR" \
    node scripts/check-deploy-drift.mjs "$HABITOFF_ORIGIN" 2>&1)" && drift_rc=0 || drift_rc=$?
  if [[ "$drift_rc" -ne 0 ]]; then
    printf 'fail\t{"note":%s,"chunk":"%s"}\n' \
      "$(head -n 2 <<<"$drift" | tr '\n' ' ' | json_escape)" "$live_chunk"
    return 0
  fi

  printf 'ok\t{"chunk":"%s","note":%s}\n' "$live_chunk" "$(printf '%s' "$drift" | json_escape)"
}

# Запуск напрямую — печатает результат и ничего никуда не пишет.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
  build_fingerprint_probe
fi
