#!/usr/bin/env python3
"""Сторож Habitoff. Живёт на втором сервере и делает три вещи.

1. **Принимает пульс.** Боевой сервер стучится каждые пять минут. Пропал пульс на
   пятнадцать — сторож сообщает сам. Это единственный способ узнать, что сервер лёг
   целиком: собственный мониторинг в такой момент лежит вместе с ним.

2. **Принимает алерты и передаёт их в Telegram.** Токен бота живёт только здесь.
   Боевой сервер знает лишь общий секрет и адрес — взлом продакшена не отдаёт бота.

3. **Проверяет сайт снаружи.** Независимо от того, что о себе думает сам сервер.

Ничего, кроме стандартной библиотеки: сторож обязан подниматься на голой машине и
не зависеть от того, что там установлено.
"""

from __future__ import annotations

import hmac
import json
import os
import ssl
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CONFIG_PATH = os.environ.get("HABITOFF_ALERTS_ENV", "/etc/habitoff-alerts.env")


def load_config() -> dict[str, str]:
    values: dict[str, str] = {}
    try:
        with open(CONFIG_PATH, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                values[key.strip()] = value.strip()
    except OSError:
        pass
    values.update({k: v for k, v in os.environ.items() if k.startswith(("TELEGRAM_", "HABITOFF_", "WATCHDOG_", "PROBE_"))})
    return values


CFG = load_config()
BOT_TOKEN = CFG.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = CFG.get("TELEGRAM_CHAT_ID", "")
SHARED_TOKEN = CFG.get("HABITOFF_TOKEN", "")
PORT = int(CFG.get("WATCHDOG_PORT", "8787"))
PROBE_URL = CFG.get("PROBE_URL", "https://habitoff.ru/")
HEARTBEAT_GRACE = int(CFG.get("HEARTBEAT_GRACE_SECONDS", "900"))
STATE_DIR = CFG.get("WATCHDOG_STATE_DIR", "/var/lib/habitoff-watchdog")
DIGEST_HOUR_MSK = int(CFG.get("DIGEST_HOUR_MSK", "10"))

os.makedirs(STATE_DIR, exist_ok=True)
HEARTBEAT_FILE = os.path.join(STATE_DIR, "last-heartbeat")
DIGEST_FILE = os.path.join(STATE_DIR, "digest.jsonl")

_lock = threading.Lock()
_open_states: dict[str, bool] = {}


def now() -> float:
    return time.time()


def send_telegram(text: str) -> bool:
    """Отправить сообщение. Молча возвращает False: сторож, падающий из-за Telegram,
    хуже отсутствующего сторожа."""
    if not BOT_TOKEN or not CHAT_ID:
        return False
    payload = urllib.parse.urlencode(
        {"chat_id": CHAT_ID, "text": text[:4000], "disable_web_page_preview": "true"}
    ).encode()
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    try:
        with urllib.request.urlopen(url, data=payload, timeout=15) as response:
            return response.status == 200
    except Exception:
        return False


def announce(level: str, check: str, detail: dict) -> None:
    """Авария уходит сразу. Предупреждение копится до утреннего дайджеста —
    иначе через неделю алерты перестают читать, и это конец всей затеи."""
    stamp = datetime.now(timezone.utc).astimezone().strftime("%H:%M")
    body = json.dumps(detail, ensure_ascii=False) if detail else ""
    if level == "critical":
        send_telegram(f"АВАРИЯ {stamp} · {check}\n{body}")
    elif level == "resolved":
        send_telegram(f"Восстановлено {stamp} · {check}")
    else:
        with _lock, open(DIGEST_FILE, "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"at": stamp, "check": check, "detail": detail}, ensure_ascii=False) + "\n")


def flush_digest() -> None:
    with _lock:
        if not os.path.exists(DIGEST_FILE):
            return
        with open(DIGEST_FILE, encoding="utf-8") as fh:
            rows = [json.loads(line) for line in fh if line.strip()]
        os.remove(DIGEST_FILE)
    if not rows:
        return
    lines = [f"Сводка за сутки · {len(rows)} предупреждений", ""]
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["check"]] = counts.get(row["check"], 0) + 1
    for check, count in sorted(counts.items(), key=lambda item: -item[1]):
        lines.append(f"{check} — {count}")
    send_telegram("\n".join(lines))


def probe_once() -> tuple[bool, int]:
    context = ssl.create_default_context()
    started = now()
    try:
        request = urllib.request.Request(PROBE_URL, headers={"User-Agent": "habitoff-watchdog"})
        with urllib.request.urlopen(request, timeout=15, context=context) as response:
            ok = response.status == 200
    except Exception:
        ok = False
    return ok, int((now() - started) * 1000)


def watch_loop() -> None:
    """Мёртвая рука и внешний зонд. Обе проверки требуют двух неудач подряд:
    одиночный сетевой сбой — это погода, а не авария."""
    probe_failures = 0
    last_digest_day = None
    while True:
        try:
            last_beat = os.path.getmtime(HEARTBEAT_FILE) if os.path.exists(HEARTBEAT_FILE) else 0
            silent_for = now() - last_beat
            if last_beat and silent_for > HEARTBEAT_GRACE:
                if not _open_states.get("heartbeat"):
                    _open_states["heartbeat"] = True
                    announce("critical", "пульс пропал",
                             {"молчит_минут": int(silent_for // 60)})
            elif last_beat and _open_states.get("heartbeat"):
                _open_states["heartbeat"] = False
                announce("resolved", "пульс вернулся", {})

            ok, latency = probe_once()
            if ok:
                if probe_failures >= 2:
                    announce("resolved", "сайт снова отвечает", {})
                probe_failures = 0
            else:
                probe_failures += 1
                if probe_failures == 2:
                    announce("critical", "сайт не отвечает снаружи", {"адрес": PROBE_URL})

            local_hour = datetime.now().hour
            today = datetime.now().date()
            if local_hour == DIGEST_HOUR_MSK and last_digest_day != today:
                last_digest_day = today
                flush_digest()
        except Exception:
            pass
        time.sleep(60)


class Handler(BaseHTTPRequestHandler):
    server_version = "habitoff-watchdog"

    def log_message(self, *_args) -> None:  # журнал systemd и без того всё видит
        return

    def _authorized(self) -> bool:
        supplied = self.headers.get("X-Habitoff-Token", "")
        return bool(SHARED_TOKEN) and hmac.compare_digest(supplied, SHARED_TOKEN)

    def _reply(self, code: int, text: str = "") -> None:
        payload = text.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:
        if self.path == "/healthz":
            self._reply(200, "ok")
        else:
            self._reply(404)

    def do_POST(self) -> None:
        if not self._authorized():
            self._reply(403)
            return
        length = min(int(self.headers.get("Content-Length", "0") or 0), 16384)
        raw = self.rfile.read(length) if length else b"{}"

        if self.path == "/heartbeat":
            with open(HEARTBEAT_FILE, "w", encoding="utf-8") as fh:
                fh.write(str(int(now())))
            self._reply(204)
            return

        if self.path == "/alert":
            try:
                data = json.loads(raw or b"{}")
            except ValueError:
                self._reply(400)
                return
            announce(
                str(data.get("level", "warning")),
                str(data.get("check", "без имени"))[:120],
                data.get("detail") if isinstance(data.get("detail"), dict) else {},
            )
            self._reply(204)
            return

        self._reply(404)


def main() -> None:
    threading.Thread(target=watch_loop, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
