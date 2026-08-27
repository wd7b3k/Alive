// Мост входа через Яндекс.
//
// GoTrue не знает Яндекса: список внешних провайдеров в self-hosted фиксирован.
// Плюс GoTrue ищет OIDC-claim `email`, а login.yandex.ru/info отдаёт `default_email` —
// поля `email` в JSON нет вовсе. Настройкой это не лечится, поэтому обмен кода на
// профиль делаем сами, а сессию выпускаем через админский API GoTrue.
//
// Письма при этом не отправляются: generate_link возвращает token_hash, который
// клиент меняет на сессию через verifyOtp. SMTP не нужен.

const CLIENT_ID = Deno.env.get("YANDEX_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("YANDEX_SECRET") ?? "";
const REDIRECT_URI = Deno.env.get("YANDEX_REDIRECT_URI") ?? "";
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "";
const AUTH_URL = Deno.env.get("GOTRUE_INTERNAL_URL") ?? "http://auth:9999";
const SERVICE_KEY = Deno.env.get("SERVICE_KEY") ?? "";

const COOKIE = "yx_state";

const seeOther = (location: string, extra: Record<string, string> = {}) =>
  new Response(null, { status: 303, headers: { Location: location, ...extra } });

// Ошибка возвращается в приложение параметром, а не текстом на белом фоне:
// человек должен оказаться там же, откуда уходил.
const fail = (reason: string) =>
  seeOther(`${APP_ORIGIN}/?auth_error=yandex_${reason}`, {
    "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  });

const admin = (path: string, init: RequestInit = {}) =>
  fetch(`${AUTH_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const action = parts[parts.length - 1];

  if (action === "start" || action === "yandex") {
    const state = crypto.randomUUID() + crypto.randomUUID();
    const authorize = new URL("https://oauth.yandex.ru/authorize");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", CLIENT_ID);
    authorize.searchParams.set("redirect_uri", REDIRECT_URI);
    authorize.searchParams.set("state", state);
    return seeOther(authorize.toString(), {
      "Set-Cookie": `${COOKIE}=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    });
  }

  if (action === "callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const saved = (req.headers.get("cookie") ?? "")
      .split(/;\s*/)
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1);

    // Без сверки state это дыра в CSRF, поэтому проверка обязательна и первая.
    if (!code || !state || !saved || state !== saved) return fail("state");

    const tokenRes = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) return fail("token");
    const { access_token } = await tokenRes.json();

    // Заголовок именно `OAuth`, как в документации Яндекса, а не `Bearer`.
    const infoRes = await fetch("https://login.yandex.ru/info?format=json", {
      headers: { Authorization: `OAuth ${access_token}` },
    });
    if (!infoRes.ok) return fail("profile");
    const profile = await infoRes.json();

    const email = String(profile.default_email ?? profile.emails?.[0] ?? "").toLowerCase();
    if (!email) return fail("no_email");

    // Поиск или создание пользователя.
    let userId = "";
    const found = await admin(`/admin/users?per_page=1&filter=${encodeURIComponent(email)}`);
    if (found.ok) {
      const body = await found.json();
      const hit = (body.users ?? []).find(
        (u: { email?: string }) => (u.email ?? "").toLowerCase() === email,
      );
      if (hit) userId = hit.id;
    }
    if (!userId) {
      const created = await admin("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          email_confirm: true,
          user_metadata: {
            provider: "yandex",
            yandex_id: String(profile.id ?? ""),
            full_name: profile.display_name ?? profile.real_name ?? null,
          },
        }),
      });
      if (!created.ok) return fail("create");
      userId = (await created.json()).id;
    }

    // Сессия без письма: generate_link возвращает одноразовый token_hash.
    const link = await admin("/admin/generate_link", {
      method: "POST",
      body: JSON.stringify({ type: "magiclink", email, redirect_to: APP_ORIGIN }),
    });
    if (!link.ok) return fail("link");
    const data = await link.json();
    const hash = data.hashed_token ?? data.properties?.hashed_token;
    if (!hash) return fail("no_hash");

    // token_hash уезжает во фрагменте: он не попадает ни в логи Caddy, ни в Referer.
    return seeOther(`${APP_ORIGIN}/#token_hash=${encodeURIComponent(hash)}&type=magiclink`, {
      "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    });
  }

  return new Response("not found", { status: 404 });
});
