import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { publicEnv } from './env';
import { getSupabase } from './supabase';

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  return pathname;
}

function Explain({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="explain">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

function ConfigurationGate() {
  return (
    <main className="center-page">
      <section className="panel setup-panel">
        <p className="eyebrow">ALIVE v3.0 · platform bootstrap</p>
        <h1>Нужно подключить Supabase</h1>
        <p>
          Код уже не хранит секреты внутри приложения. Для запуска добавь локальный файл
          <code> app/.env.local </code> по образцу <code>.env.example</code>.
        </p>
        <div className="notice">
          В браузер допустимо передавать только Supabase URL и publishable key. Service role key и
          Google OAuth secret здесь использовать нельзя.
        </div>
      </section>
    </main>
  );
}

function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function login() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${publicEnv.appOrigin}/` },
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
    }
  }

  return (
    <main className="center-page">
      <section className="hero panel">
        <p className="eyebrow">Некоммерческий эксперимент</p>
        <h1>Вернуть пространство между импульсом и действием.</h1>
        <p className="lead">
          ALIVE помогает замечать никотиновые автоматизмы, понимать, что именно ты сейчас ищешь,
          пробовать другой ответ и учиться на собственном результате.
        </p>
        <button className="primary" onClick={login} disabled={busy}>
          {busy ? 'Открываю Google…' : 'Войти через Google'}
        </button>
        {error && <p className="error">{error}</p>}
        <p className="fineprint">
          Мы используем Google только для входа и идентификации участника. Поведенческие данные
          хранятся отдельно в ALIVE.
        </p>
        <button className="link-button" onClick={() => navigate('/experiment')}>
          Что это за эксперимент?
        </button>
      </section>
    </main>
  );
}

function Home({ session }: { session: Session }) {
  const user = session.user;
  const displayName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'участник';

  async function signOut() {
    await getSupabase()?.auth.signOut();
  }

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')}>ALIVE</button>
        <nav>
          <button className="nav-link active" onClick={() => navigate('/')}>Сегодня</button>
          <button className="nav-link" onClick={() => navigate('/experiment')}>Эксперимент</button>
        </nav>
        <div className="profile">
          {user.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} alt="" referrerPolicy="no-referrer" />
          )}
          <span>{displayName}</span>
          <button className="link-button" onClick={signOut}>Выйти</button>
        </div>
      </header>

      <main className="app-page">
        <section className="hero panel">
          <p className="eyebrow">ALIVE Method v1</p>
          <h1>{displayName}, начинаем не с запрета, а с наблюдения.</h1>
          <p className="lead">
            В момент тяги ALIVE будет помогать пройти короткую цепочку: контекст → потребность →
            подходящая Замена → результат. На следующих шагах мы подключим onboarding и реальный
            craving flow.
          </p>
          <div className="actions">
            <button className="primary" disabled>Сейчас тянет</button>
            <span className="status-pill">следующий шаг разработки</span>
          </div>
        </section>

        <section className="grid three">
          <article className="panel card">
            <h2>Связка</h2>
            <p>Повторяющийся сценарий, где ситуация и состояние почти автоматически ведут к никотину.</p>
            <Explain title="Подробнее">
              Мы будем искать конкретные цепочки, например «кофе → пауза → сигарета», а не считать
              зависимость одним абстрактным желанием курить.
            </Explain>
          </article>
          <article className="panel card">
            <h2>Замена</h2>
            <p>Действие, которое пытается дать ту функцию, которую сейчас обещает никотиновый ритуал.</p>
            <Explain title="Почему не просто отвлечься?">
              Если человеку нужна пауза, бессмысленно всегда предлагать физическую нагрузку. ALIVE
              сначала выясняет потребность и затем подбирает подходящий ответ.
            </Explain>
          </article>
          <article className="panel card">
            <h2>ALIVE units</h2>
            <p>Внутренняя условная единица для сопоставления разных никотиновых продуктов.</p>
            <Explain title="Важно: это не медицинский эквивалент">
              ALIVE units не измеряют вред и не говорят, что разные продукты одинаково воздействуют
              на организм. Raw сигареты, кальяны и затяжки сохраняются отдельно, а модель units можно
              пересчитывать без изменения исходной истории.
            </Explain>
          </article>
        </section>
      </main>
    </>
  );
}

function ExperimentPage() {
  return (
    <main className="article-page">
      <button className="back" onClick={() => navigate('/')}>← В ALIVE</button>
      <article className="panel article">
        <p className="eyebrow">ALIVE Method v1</p>
        <h1>ALIVE — эксперимент над автоматизмом.</h1>
        <p className="lead"><strong>Мы ничего тебе не обещаем.</strong></p>
        <p>
          ALIVE проверяет рабочую гипотезу: никотиновую зависимость можно пытаться ослаблять не только
          запретом и силой воли, а постепенно меняя связь между состоянием, импульсом и привычным
          ответом.
        </p>

        <h2>Что мы называем «перепрошивкой»</h2>
        <p>
          Это метафора, а не медицинский термин. Мы хотим проверить простую идею: если снова и снова
          замечать автоматический сценарий и проживать ту же потребность другим способом, старый
          сценарий может постепенно перестать быть единственным.
        </p>

        <h2>Рабочие предположения</h2>
        <ol>
          <li>Зависимость проявляется через повторяющиеся Связки, а не через одну абстрактную тягу.</li>
          <li>Никотиновое действие может выполнять одновременно фармакологическую, ритуальную, социальную и эмоциональную функции.</li>
          <li>Одну функцию иногда можно частично закрыть другим действием.</li>
          <li>Универсальной Замены нет — поэтому важны твои реальные outcomes.</li>
          <li>Эпизод употребления не обнуляет эксперимент: это новые данные о контексте.</li>
        </ol>

        <h2>Что может измениться, если гипотеза сработает</h2>
        <p>
          Человек может отказаться от курения или заметно сократить употребление, сэкономить деньги и
          время, меньше зависеть от автоматических ритуалов и высвободить больше внимания и энергии для
          собственной жизни. Отказ от курения сам по себе полезен для здоровья, но ALIVE не присваивает
          себе медицинскую причинность и не гарантирует конкретный результат.
        </p>

        <h2>Если не сработает</h2>
        <p>
          Ты можешь прекратить эксперимент и удалить свои данные. ALIVE не требует отказываться от
          врача, психотерапии, NRT или других доказательных методов прекращения употребления табака.
        </p>

        <h2>Privacy</h2>
        <p className="quote">Эти данные слишком личные, чтобы превращать их в рекламный профиль.</p>
        <p>
          ALIVE не строится на продаже внимания или поведенческих данных. Личные эпизоды, Смыслы и
          Связки приватны по умолчанию. Пользовательский текст не становится общим контентом без
          отдельного действия «Предложить в общую базу».
        </p>
        <p>
          Абсолютно неуязвимых систем не существует. Инфраструктурные поставщики — в частности Google,
          Cloudflare и Supabase — неизбежно обрабатывают часть технических данных по собственным правилам.
          Наша задача — собирать минимум, технически изолировать пользователей и не превращать
          чувствительные данные в коммерческий профиль.
        </p>

        <h2>Что является фактом, а что эвристикой</h2>
        <div className="fact-grid">
          <div><strong>Достаточно хорошо подтверждено</strong><p>Отказ от курения полезен; никотиновая зависимость реальна; NRT является признанным инструментом прекращения курения.</p></div>
          <div><strong>Проверяем применимость</strong><p>Контекстные Замены, персональные Смыслы, явные Связки и групповая поддержка как единая продуктовая система.</p></div>
          <div><strong>Эвристики ALIVE</strong><p>1 кальян = 10 ALIVE units; 10 vape puffs = 1 ALIVE unit; ranking Замены. Это рабочие модели, не медицинские эквиваленты.</p></div>
        </div>
      </article>
    </main>
  );
}

export default function App() {
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  if (pathname === '/experiment') return <ExperimentPage />;
  if (!publicEnv.isConfigured) return <ConfigurationGate />;
  if (loading) return <main className="center-page"><p>Загрузка ALIVE…</p></main>;
  if (!session) return <Login />;
  return <Home session={session} />;
}
