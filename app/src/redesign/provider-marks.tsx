/**
 * Знаки провайдеров входа.
 *
 * Кнопка «Войти через …» без знака требует прочитать строку, чтобы понять, куда
 * нажимаешь. Знак читается раньше текста, поэтому он здесь есть — и он должен быть
 * настоящим: цвета Google и красный Яндекса заданы точными значениями их фирменных
 * палитр, а не подогнаны под нашу. Это единственное место во всём интерфейсе, где
 * появляются чужие цвета, и они не участвуют в системе Habitoff.
 *
 * Плитка под знаком принадлежит провайдеру: белая у Google (его знак существует только
 * на светлом), красная у Яндекса (его знак — белая «Я» на красном). Не перекрашивать.
 */

/** Фон плитки под знаком провайдера. */
export function providerTile(id: string): string {
  return normalize(id) === 'yandex' ? '#fc3f1d' : '#ffffff';
}

function normalize(id: string): string {
  return id.replace(/^custom:/, '');
}

export function ProviderMark({ id }: { id: string }) {
  const kind = normalize(id);
  if (kind === 'yandex') return <YandexMark />;
  if (kind === 'google') return <GoogleMark />;
  return <GenericMark id={kind} />;
}

/** Четырёхцветная «G». Пропорции и цвета — как в фирменном руководстве Google. */
function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.27 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/** Белая «Я» на красной плитке. Контур собран вручную, чтобы не тащить шрифт. */
function YandexMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#ffffff"
        fillRule="evenodd"
        d="M16.9 4.6v14.8h-3.05v-5.5h-1.02L9.9 19.4H6.3l3.24-5.95c-1.86-.78-2.9-2.28-2.9-4.16 0-2.75 1.98-4.69 4.98-4.69H16.9Zm-3.05 2.85h-1.7c-1.3 0-2.12.74-2.12 1.94 0 1.17.78 1.9 2.1 1.9h1.72V7.45Z"
      />
    </svg>
  );
}

/** Провайдер, которого мы не рисовали: первая буква вместо знака, но кнопка есть. */
function GenericMark({ id }: { id: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="#0d1b1f"
        fontFamily="system-ui, sans-serif"
      >
        {(id[0] ?? '?').toUpperCase()}
      </text>
    </svg>
  );
}
