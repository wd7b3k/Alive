import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import {
  addLink,
  addMeaning,
  deleteEpisode,
  deleteLink,
  deleteMeaning,
  describeOffer,
  pickReplacements,
  productLabel,
  saveCheckin,
  saveGuidedEpisode,
  saveOnboarding,
  submitLink,
  submitMeaning,
  updateMeaning,
  type Bootstrap,
  type Goal,
  type GuidedEpisodeDraft,
  type KnowledgeCard,
  type NicotineProduct,
  type OnboardingDraft,
  type ProductType,
  type PublicCatalog,
  type Trigger,
  type UserMeaning,
  EMPTY_KNOWLEDGE,
} from './data';
import { deleteMyAccount, exportMyData, saveQuickUse } from './actions';
import { dailyUnits, replacementStats, statsForDays, triggerStats } from './domain/metrics';
import {
  flowOpening,
  frequentTriggers,
  needGuess,
  stepAfterTrigger,
  type NeedGuess,
} from './domain/flow-defaults';
import { Icon } from './ui-icons';
import { useLocation } from 'react-router-dom';
import { useBootstrapSession } from './hooks/useBootstrapSession';
import {
  awarenessForMoment,
  cardOfTheDay,
  cardsForSurface,
  cardsForTrigger,
  splitByKind,
} from './domain/knowledge';
import {
  AwarenessCardView,
  EvidenceBadge,
  EvidenceDetail,
  KnowledgeCardView,
  KnowledgeCollapsed,
} from './redesign/knowledge';
import { GoalCard, GoalLibrary, GoalSpotlight, goalOfTheDay } from './redesign/goals';
import { ShareWin } from './redesign/share';
import { usePublicCatalog } from './hooks/usePublicCatalog';
import { Brand, Header, LoginPage, Modal, PublicHeader, ShellButton } from './redesign/shared';
import { RELEASES } from './redesign/releases';

/**
 * Админка грузится отдельным куском.
 *
 * Она носит с собой доску целиком — `cards.json` это сотня килобайт, — а открывает её
 * один человек. Статический импорт положил бы эти килобайты в общий бандл и раздавал бы
 * их каждому анонимному гостю: замер показал 607 КБ против 717 КБ. Карточка про вес
 * клиента в бэклоге стоит P0, и увеличивать его ради закрытого раздела нечестно.
 */
const AdminPage = lazy(() =>
  import('./redesign/admin').then((module) => ({ default: module.AdminPage })),
);
import { buildInfo } from './env';
import {
  fmt,
  localDay,
  money,
  needIcon,
  plural,
  productIcon,
  replacementIcon,
  replacementKind,
  tobaccoSummary,
  triggerIcon,
  when,
} from './redesign/utils';
import { trackEvent } from './services/analytics';
import { reportError } from './services/error-monitoring';
import { navigateTo as go } from './services/navigation';
import { InstallPrompt } from './redesign/install';
import { TogetherPage } from './redesign/together';
import { HealthPage } from './redesign/health';

/**
 * What a visitor sees before signing in: the real catalog, not a locked door.
 *
 * Owner decision 2026-08-22 — sign-in is no longer a wall on the first screen. Every
 * control here that would write something raises Google sign-in at the moment it is
 * pressed, so the account is asked for when it is actually needed.
 *
 * Everything rendered is public editorial content read with the anon key. There is no
 * personal data on this screen and none can be: the private tables are unreadable
 * without a session, asserted by the anon block in
 * supabase/tests/local/03_rls_isolation_test.sql.
 */
function PublicHome({ catalog, path }: { catalog: PublicCatalog | null; path: string }) {
  // No product filter before sign-in: nobody has said what they use yet, so every
  // published card is relevant until they do.
  const publicCards = cardsForSurface(catalog?.knowledge ?? EMPTY_KNOWLEDGE, 'public');
  const allCards = catalog?.knowledge.cards ?? [];
  const { facts, myths } = splitByKind(allCards);

  // Каждая кнопка, которая раньше сразу открывала Google, теперь ведёт на экран входа.
  // Способов входа стало больше одного, и выбирать за человека, каким аккаунтом ему
  // заходить, — это ровно та мелочь, из-за которой уходят, не начав.
  function signIn() {
    go('/login');
  }
  const busy = false;
  const error = '';

  return (
    <>
      <PublicHeader path={path} />
      <main className="r-page">
        {path === '/links' && <PublicLinks catalog={catalog} onSignIn={signIn} />}
        {path === '/meanings' && <PublicMeanings catalog={catalog} />}
        {path === '/knowledge' && <PublicKnowledge facts={facts} myths={myths} catalog={catalog} />}
        {path !== '/links' && path !== '/meanings' && path !== '/knowledge' && (
          <>
            {/* Первый экран несёт только имя, обещание и одно действие. Всё остальное —
                вторичные действия, оговорка о приватности, приглашение вглубь — стоит
                ниже: до перестройки они делили первый экран с главным действием, и
                главное действие переставало быть главным. */}
            <section className="r-now">
              <div className="r-now-copy">
                <h1>Не запрещать себе — вернуть себе выбор</h1>
                <p className="r-lead">
                  Habitoff помогает заметить, что именно запускает автоматический ритуал, понять,
                  какое состояние ты на самом деле ищешь, и подобрать другой ответ — под конкретный
                  момент.
                </p>
              </div>
              <div className="r-now-actions">
                <button
                  type="button"
                  className="r-craving"
                  onClick={signIn}
                  disabled={busy}
                  aria-describedby="cta-vape-note-public"
                >
                  <span className="r-craving-icon">
                    <Icon name="spark" size={26} />
                  </span>
                  <span>
                    <small>Когда важно действовать прямо сейчас</small>
                    <strong>
                      Хочу курить<sup aria-hidden="true">*</sup>
                    </strong>
                    <em>Разобрать момент и выбрать другой ответ</em>
                  </span>
                  <Icon name="arrow" size={22} />
                </button>
                <p className="r-cta-note" id="cta-vape-note-public">
                  <span aria-hidden="true">*</span> для вэйперов, конечно же, — парить
                </p>
                {error && <p className="r-error">{error}</p>}
              </div>
            </section>

            {/* Тихая секция: без рамки и фона. Чередование рамка / не рамка само рисует
                границы разделов — до этого шесть одинаковых карточек подряд читались как
                одно бесконечное полотно. */}
            <section className="r-section plain">
              <div className="r-secondary-actions">
                <button type="button" onClick={signIn} disabled={busy}>
                  <Icon name="smoke" size={22} />
                  <span>
                    <strong>Никотин уже был</strong>
                    <small>Просто записать факт</small>
                  </span>
                </button>
                <button type="button" onClick={() => go('/experiment')}>
                  <Icon name="shield" size={22} />
                  <span>
                    <strong>Как это работает</strong>
                    <small>Методология и приватность</small>
                  </span>
                </button>
              </div>
              <p className="r-privacy">
                Вход нужен только для того, чтобы узнать тебя при следующем заходе. Личные записи
                хранятся отдельно и защищаются правилами доступа PostgreSQL: их не видит никто,
                кроме тебя.
              </p>
            </section>

            {!catalog && (
              <section className="r-section">
                <p className="r-kicker">Загружаю каталог…</p>
              </section>
            )}

            {/* Ниже каталоги показаны превью, а не целиком: каждый из них — отдельный
                экран, до которого уже ведёт нижнее меню. Полный каталог на главной
                означал, что главная дублирует четыре других экрана и растягивается на
                шесть с половиной экранов прокрутки. */}
            {catalog && catalog.triggers.length > 0 && (
              <section className="r-section">
                <div className="r-section-head">
                  <div>
                    <p className="r-kicker observe">Карта контекстов</p>
                    <h2>Что система уже умеет замечать</h2>
                  </div>
                  <button onClick={() => go('/links')}>
                    Вся карта · {catalog.triggers.length} <Icon name="arrow" size={16} />
                  </button>
                </div>
                <div className="r-strip">
                  {catalog.triggers.slice(0, 6).map((trigger) => (
                    <button
                      key={trigger.code}
                      type="button"
                      className="r-trigger-card"
                      onClick={signIn}
                      disabled={busy}
                    >
                      <span className="r-choice-icon">
                        <Icon name={triggerIcon(trigger)} size={23} />
                      </span>
                      <div>
                        <strong>{trigger.title}</strong>
                        <p>{trigger.description}</p>
                      </div>
                      <span className="r-rate">открыть</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {catalog && catalog.goals.length > 0 && (
              <section className="r-section plain">
                <div className="r-section-head">
                  <div>
                    <p className="r-kicker">Смыслы</p>
                    <h2>Ради чего становится интереснее жить иначе</h2>
                  </div>
                  <button onClick={() => go('/meanings')}>
                    Все смыслы · {catalog.goals.length} <Icon name="arrow" size={16} />
                  </button>
                </div>
                {/* Фильтр по типу здесь не нужен: это превью из трёх карточек, а не
                    библиотека. Библиотека — на своём экране. */}
                <div className="r-strip">
                  {catalog.goals.slice(0, 3).map((goal) => (
                    <GoalCard key={goal.code} goal={goal} preview />
                  ))}
                </div>
              </section>
            )}

            {publicCards.length > 0 && (
              <section className="r-section">
                <div className="r-section-head">
                  <div>
                    <p className="r-kicker">Факты</p>
                    <h2>Что известно — и где это заканчивается</h2>
                  </div>
                  <button onClick={() => go('/knowledge')}>
                    Все факты · {allCards.length} <Icon name="arrow" size={16} />
                  </button>
                </div>
                {/* Одна карточка, а не весь слой: раздел на главной обязан быть
                    приглашением, иначе экран «Факты» нечего открывать. */}
                <KnowledgeCardView
                  knowledge={catalog?.knowledge ?? EMPTY_KNOWLEDGE}
                  card={publicCards[0]}
                />
              </section>
            )}

            {/* Замены и закрывающее действие — один блок. Действие повторяется внизу:
                до перестройки «Хочу курить» стояло на 600px и больше не возвращалось на
                оставшихся 4800, то есть доскроллив, человек не мог начать, не вернувшись
                наверх. */}
            <section className="r-section">
              <div className="r-section-head">
                <div>
                  <p className="r-kicker">Ответы вместо запрета</p>
                  <h2>
                    {catalog && catalog.replacements.length > 0
                      ? `${catalog.replacements.length} замен, подобранных под ситуацию`
                      : 'Здесь настоящая система, а не витрина'}
                  </h2>
                </div>
              </div>
              {catalog && catalog.replacements.length > 0 && (
                <div className="r-strip">
                  {catalog.replacements.slice(0, 3).map((replacement) => (
                    <article key={replacement.code} className="r-meaning-card">
                      <span className="r-meaning-symbol">
                        <Icon name={replacementIcon(replacement)} size={25} />
                      </span>
                      <h3>{replacement.title}</h3>
                      <p>{replacement.summary || replacement.instruction}</p>
                    </article>
                  ))}
                </div>
              )}
              <p className="r-closing-note">
                Те же Связки и Смыслы, которые работают внутри. Аккаунт нужен только для того, чтобы
                сохранять твои личные записи.
              </p>
              <ShellButton className="primary" onClick={signIn} disabled={busy}>
                Войти и начать <Icon name="arrow" size={18} />
              </ShellButton>
            </section>
          </>
        )}
      </main>
    </>
  );
}

/**
 * «Связки» до входа.
 *
 * Показывает то же, что и внутри: контекст, потребность под ним и ответы, которые Habitoff
 * подбирает. Разница одна — здесь нельзя разобрать свой момент, потому что сохранять его
 * некуда. Это и есть честная причина завести аккаунт, и она названа на экране, а не
 * спрятана за кнопкой.
 */
function PublicLinks({
  catalog,
  onSignIn,
}: {
  catalog: PublicCatalog | null;
  onSignIn: () => void;
}) {
  const triggers = catalog?.triggers ?? [];
  const map = catalog?.triggerReplacementMap ?? [];
  const byCode = new Map((catalog?.replacements ?? []).map((r) => [r.code, r]));
  return (
    <>
      <section className="r-title">
        <p className="r-kicker">Связки</p>
        <h1>Ситуация → потребность → привычный ответ</h1>
        <p className="r-lead">
          Зависимость держится не на никотине как таковом, а на связке: определённый момент —
          определённое состояние — один и тот же ответ. {triggers.length} таких моментов Habitoff
          умеет разбирать, и под каждый подбирает не «полезную привычку вообще», а то, что закрывает
          именно эту потребность.
        </p>
      </section>
      {triggers.map((trigger) => {
        const codes = map
          .filter((m) => m.trigger_code === trigger.code)
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 3)
          .map((m) => byCode.get(m.replacement_code))
          .filter(Boolean);
        return (
          <section className="r-section" key={trigger.code}>
            <div className="r-section-head">
              <div>
                <p className="r-kicker">Контекст</p>
                <h2>{trigger.title}</h2>
                <p>{trigger.description}</p>
              </div>
            </div>
            {codes.length > 0 && (
              <div className="r-meaning-grid">
                {codes.map((replacement) => (
                  <article key={replacement!.code}>
                    <span className="r-meaning-symbol">
                      <Icon name={replacementIcon(replacement!)} size={25} />
                    </span>
                    <h3>{replacement!.title}</h3>
                    <p>{replacement!.summary || replacement!.instruction}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Дальше</p>
            <h2>Разобрать свой момент</h2>
            <p>
              Здесь показан общий каталог. Твоя карта строится на твоих эпизодах: какой момент
              повторяется чаще, что в нём срабатывает, а что нет. Для этого нужен аккаунт — больше
              его хранить негде.
            </p>
          </div>
        </div>
        <div className="r-actions">
          <ShellButton className="primary" onClick={onSignIn}>
            Войти и начать <Icon name="arrow" size={18} />
          </ShellButton>
        </div>
      </section>
    </>
  );
}

/** «Смыслы» до входа: вся библиотека, без переноса в свой черновик — сохранять некуда. */
function PublicMeanings({ catalog }: { catalog: PublicCatalog | null }) {
  const goals = catalog?.goals ?? [];
  return (
    <>
      <section className="r-title meaning">
        <p className="r-kicker">Смыслы</p>
        <h1>Ради чего становится интереснее жить иначе</h1>
        <p className="r-lead">
          Habitoff не работает запретами. Он начинается со смысла, ради которого стоит менять
          привычку, — и возвращает тебя к нему в тот момент, когда это труднее всего. У каждой
          карточки есть вопрос: на него отвечать интереснее, чем соглашаться с лозунгом.
        </p>
      </section>
      <section className="r-section">
        <GoalLibrary goals={goals} />
      </section>
    </>
  );
}

/** «Факты» до входа: те же карточки, что и внутри, с источниками и границами. */
function PublicKnowledge({
  facts,
  myths,
  catalog,
}: {
  facts: KnowledgeCard[];
  myths: KnowledgeCard[];
  catalog: PublicCatalog | null;
}) {
  const knowledge = catalog?.knowledge ?? EMPTY_KNOWLEDGE;
  return (
    <>
      <section className="r-title">
        <p className="r-kicker">Факты</p>
        <h1>Что известно — и где это заканчивается</h1>
        <p className="r-lead">
          Ни одного утверждения без источника и без границ. Три популярных утверждения здесь
          сознательно не опубликованы, потому что источника у них нет: «тяга длится 3–5 минут»,
          «вейп на 95 % безопаснее» и любое соотношение «один кальян = N сигарет».
        </p>
      </section>
      {facts.length > 0 && (
        <section className="r-section">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Проверенное</p>
              <h2>
                {facts.length} {plural(facts.length, 'вещь', 'вещи', 'вещей')}, которые стоит знать
              </h2>
            </div>
          </div>
          <div className="r-knowledge-grid">
            {facts.map((card) => (
              <KnowledgeCardView key={card.code} knowledge={knowledge} card={card} />
            ))}
          </div>
        </section>
      )}
      {myths.length > 0 && (
        <section className="r-section">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Опровергнутое</p>
              <h2>
                {myths.length} {plural(myths.length, 'убеждение', 'убеждения', 'убеждений')},
                которые не подтверждаются
              </h2>
              <p>
                Заголовок каждой карточки — это то, что часто говорят, а не то, что утверждает
                Habitoff.
              </p>
            </div>
          </div>
          <div className="r-knowledge-grid">
            {myths.map((card) => (
              <KnowledgeCardView key={card.code} knowledge={knowledge} card={card} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Setup({
  session,
  data,
  done,
  cancel,
}: {
  session: Session;
  data: Bootstrap | null;
  done: () => Promise<void>;
  cancel?: () => void;
}) {
  const existing = useMemo(
    () => new Map((data?.products ?? []).map((p) => [p.product_type, p])),
    [data],
  );
  const [chosen, setChosen] = useState<Record<ProductType, boolean>>({
    cigarette: existing.has('cigarette') || !data,
    hookah: existing.has('hookah'),
    vape: existing.has('vape'),
  });
  const [goal, setGoal] = useState(data?.settings.goal_text ?? '');
  const [cigs, setCigs] = useState(
    String(existing.get('cigarette')?.baseline?.cigarettes_per_day ?? ''),
  );
  const [pack, setPack] = useState(
    String(existing.get('cigarette')?.defaults?.pack_price_rub ?? ''),
  );
  const [hookahs, setHookahs] = useState(
    String(existing.get('hookah')?.baseline?.sessions_per_week ?? ''),
  );
  const [hookahPrice, setHookahPrice] = useState(
    String(existing.get('hookah')?.defaults?.hookah_default_price_rub ?? 2500),
  );
  const [puffs, setPuffs] = useState(String(existing.get('vape')?.baseline?.puffs_per_day ?? ''));
  const [vapePrice, setVapePrice] = useState(
    String(existing.get('vape')?.defaults?.consumable_price_rub ?? 1500),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    const products: OnboardingDraft['products'] = [];
    // Пустое поле — это «не знаю», а не «ноль». Раньше `Number('' || 0)` молча писал в
    // исходный уровень ноль, и сравнение «сейчас против исходного» для этого участника
    // становилось бессмысленным, а он об этом не узнавал. См. ADR-0006.
    const answered = (raw: string) => {
      const value = Number(raw);
      return raw.trim() !== '' && Number.isFinite(value) && value >= 0 ? { value } : null;
    };
    const baseline = (raw: string, key: string) => {
      const parsed = answered(raw);
      return parsed ? { [key]: parsed.value } : {};
    };
    if (chosen.cigarette)
      products.push({
        productType: 'cigarette',
        role: 'target_dependency',
        baseline: baseline(cigs, 'cigarettes_per_day'),
        defaults: { ...baseline(pack, 'pack_price_rub'), pack_size: 20 },
      });
    if (chosen.hookah)
      products.push({
        productType: 'hookah',
        role: 'target_dependency',
        baseline: baseline(hookahs, 'sessions_per_week'),
        defaults: { hookah_default_price_rub: answered(hookahPrice)?.value ?? 2500 },
      });
    if (chosen.vape)
      products.push({
        productType: 'vape',
        role: 'target_dependency',
        baseline: baseline(puffs, 'puffs_per_day'),
        defaults: {
          claimed_puffs: 5000,
          consumable_price_rub: answered(vapePrice)?.value ?? 1500,
          device_type: 'disposable',
        },
      });
    if (!products.length) {
      setError('Отметь хотя бы один продукт — иначе не с чем будет сравнивать динамику.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveOnboarding(session, { goalText: goal, products });
      await done();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить настройки');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="r-setup-page">
      <section className="r-setup">
        <div className="r-setup-head">
          <div>
            <p className="r-kicker">Настройка личной карты</p>
            <h1>С чего ты начинаешь</h1>
            <p>
              Исходный уровень нужен для одного: сравнивать тебя с тобой прежним, а не с кем-то ещё.
            </p>
          </div>
          {cancel ? (
            <button className="r-icon-button" onClick={cancel}>
              <Icon name="close" />
            </button>
          ) : (
            // Первый заход: закрыть экран нечем, и до этой правки человек, не готовый
            // заполнять форму, упирался в тупик — ни «Отмена», ни «Назад». Теперь есть
            // выход в открытую часть продукта; настройка спросит снова при следующем
            // заходе, ничего не теряется. См. ADR-0006.
            <button className="r-button ghost small" onClick={() => go('/knowledge')}>
              Пока просто посмотреть
            </button>
          )}
        </div>
        <label className="r-field">
          <span>Что ты хочешь вернуть себе?</span>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Например: больше энергии, свободное утро, спокойствие без сигареты, ощущение собственной силы"
          />
        </label>
        <div className="r-product-grid">
          {(['cigarette', 'hookah', 'vape'] as ProductType[]).map((p) => (
            <button
              key={p}
              className={`r-product-choice ${chosen[p] ? 'selected' : ''}`}
              onClick={() => setChosen((v) => ({ ...v, [p]: !v[p] }))}
            >
              <span className="r-product-icon">
                <Icon name={productIcon(p)} size={25} />
              </span>
              <strong>{productLabel(p)}</strong>
              <small>{chosen[p] ? 'учитываем' : 'не учитывать'}</small>
            </button>
          ))}
        </div>
        {chosen.cigarette && (
          <div className="r-inline-fields">
            <label className="r-field">
              <span>Сигарет в день сейчас</span>
              <input type="number" min="0" value={cigs} onChange={(e) => setCigs(e.target.value)} />
            </label>
            <label className="r-field">
              <span>Цена пачки, ₽</span>
              <input type="number" min="0" value={pack} onChange={(e) => setPack(e.target.value)} />
            </label>
          </div>
        )}
        {chosen.hookah && (
          <div className="r-inline-fields">
            <label className="r-field">
              <span>Кальянов в неделю</span>
              <input
                type="number"
                min="0"
                value={hookahs}
                onChange={(e) => setHookahs(e.target.value)}
              />
            </label>
            <label className="r-field">
              <span>Обычная стоимость, ₽</span>
              <input
                type="number"
                min="0"
                value={hookahPrice}
                onChange={(e) => setHookahPrice(e.target.value)}
              />
            </label>
          </div>
        )}
        {chosen.vape && (
          <div className="r-inline-fields">
            <label className="r-field">
              <span>Затяжек в день примерно</span>
              <input
                type="number"
                min="0"
                value={puffs}
                onChange={(e) => setPuffs(e.target.value)}
              />
            </label>
            <label className="r-field">
              <span>Стоимость устройства / расходника, ₽</span>
              <input
                type="number"
                min="0"
                value={vapePrice}
                onChange={(e) => setVapePrice(e.target.value)}
              />
            </label>
          </div>
        )}
        <div className="r-note">
          <Icon name="shield" />
          <p>
            Единицы Habitoff — внутренняя шкала поведения: сигарета = 1, кальянная сессия = 10, 10
            затяжек электронной сигареты = 1. Это рабочая модель продукта, а не медицинское
            сравнение вреда.
          </p>
        </div>
        {error && <p className="r-error">{error}</p>}
        <div className="r-actions">
          <ShellButton className="primary" onClick={save} disabled={busy}>
            {busy ? 'Сохраняю…' : 'Сохранить и начать'} <Icon name="arrow" size={18} />
          </ShellButton>
          {cancel && (
            <ShellButton className="ghost" onClick={cancel}>
              Отмена
            </ShellButton>
          )}
        </div>
      </section>
    </main>
  );
}

function EpisodeCard({
  data,
  episode,
  remove,
}: {
  data: Bootstrap;
  episode: Bootstrap['episodes'][number];
  remove: (id: string) => void;
}) {
  const trigger = data.triggers.find((x) => x.code === episode.trigger_code);
  const need = data.needs.find((x) => x.code === episode.need_code);
  const action = data.actions.find((x) => x.episode_id === episode.id && x.replacement_code);
  const replacement = data.replacements.find((x) => x.code === action?.replacement_code);
  const event = data.tobaccoEvents.find((x) => x.episode_id === episode.id);
  const success = episode.outcome === 'successful_response';
  const used = episode.outcome === 'nicotine_used';
  const delta =
    episode.craving_before !== null && episode.craving_after !== null
      ? episode.craving_before - episode.craving_after
      : null;
  const status = success ? 'Выбор остался твоим' : used ? 'Никотин использован' : 'Эпизод закрыт';
  const motivational = success
    ? delta && delta > 0
      ? `Тяга снизилась на ${delta}. Этот ответ сработал — у тебя есть рабочая альтернатива.`
      : 'Никотиновый ответ не сработал автоматически. Это один повтор нового сценария.'
    : used
      ? replacement
        ? `Сначала «${replacement.title}», потом никотин. Эпизод всё равно записан: теперь видно, где этот ответ не удержал момент.`
        : `${tobaccoSummary(event)} — итог эпизода. Контекст записан, и это уже данные.`
      : 'Даже незавершённый эпизод помогает замечать момент, в котором включается автоматизм.';
  return (
    <article className={`r-episode-card ${success ? 'success' : used ? 'used' : 'neutral'}`}>
      <div className="r-episode-top">
        <span className="r-episode-product">
          <Icon name={productIcon(episode.target_product)} size={18} />
          {productLabel(episode.target_product)}
        </span>
        <span className="r-episode-time">
          <Icon name="clock" size={14} />
          {when(episode.started_at)}
        </span>
        <button
          className="r-delete"
          title="Удалить ошибочную запись"
          onClick={() => remove(episode.id)}
        >
          <Icon name="trash" size={17} />
        </button>
      </div>
      <div className="r-episode-status">
        <span className="r-status-icon">
          <Icon
            name={success ? 'check' : used ? productIcon(episode.target_product) : 'pause'}
            size={22}
          />
        </span>
        <div>
          <small>{status}</small>
          <h3>{trigger?.title || episode.custom_trigger_text || 'Контекст не указан'}</h3>
        </div>
      </div>
      <div className="r-chain-line">
        <span>
          <b>Ситуация</b>
          {trigger?.title || episode.custom_trigger_text || 'не указана'}
        </span>
        <Icon name="arrow" size={17} />
        <span>
          <b>Нужно было</b>
          {need?.title || 'не определено'}
        </span>
      </div>
      {replacement ? (
        <div className="r-replacement-used">
          <span className="r-replacement-icon">
            <Icon name={replacementIcon(replacement)} size={22} />
          </span>
          <div>
            <small>Ответ вместо автоматизма</small>
            <strong>{replacement.title}</strong>
            <span>{replacement.duration || replacementKind(replacement)}</span>
          </div>
        </div>
      ) : (
        <div className="r-no-replacement">
          <Icon name="pause" size={19} />
          <span>
            <b>Замены не было.</b> Никотиновый продукт не считается заменой.
          </span>
        </div>
      )}
      <div className="r-episode-result">
        <div>
          {episode.craving_before !== null ? (
            <span>
              <small>Тяга</small>
              <b>
                {episode.craving_before} → {episode.craving_after ?? '—'}
              </b>
            </span>
          ) : null}
          {episode.helpfulness !== null ? (
            <span>
              <small>Помогло</small>
              <b>{episode.helpfulness}/5</b>
            </span>
          ) : null}
          {used ? (
            <span>
              <small>Итог</small>
              <b>{tobaccoSummary(event)}</b>
            </span>
          ) : null}
        </div>
        <p>{motivational}</p>
      </div>
    </article>
  );
}

function QuickUse({
  session,
  data,
  close,
  saved,
}: {
  session: Session;
  data: Bootstrap;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const [product, setProduct] = useState<ProductType>(
    data.products[0]?.product_type ?? 'cigarette',
  );
  const [trigger, setTrigger] = useState('');
  const [qty, setQty] = useState(1);
  const [puffs, setPuffs] = useState(10);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await saveQuickUse(session, {
        product,
        triggerCode: trigger || undefined,
        cigaretteQuantity: product === 'cigarette' ? qty : undefined,
        hookahSessionCount: product === 'hookah' ? 1 : undefined,
        vapePuffs: product === 'vape' ? puffs : undefined,
      });
      await saved();
      close();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal onClose={close}>
      <div className="r-modal-head">
        <div>
          <p className="r-kicker">Просто факт · без оценки</p>
          <h2>Никотин уже был</h2>
          <p>
            Здесь нет «замены»: употребление записывается отдельно, чтобы история оставалась
            честной.
          </p>
        </div>
        <button className="r-icon-button" onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      <div className="r-product-switch">
        {data.products.map((p) => (
          <button
            key={p.product_type}
            className={product === p.product_type ? 'selected' : ''}
            onClick={() => setProduct(p.product_type)}
          >
            <Icon name={productIcon(p.product_type)} size={20} />
            {productLabel(p.product_type)}
          </button>
        ))}
      </div>
      <label className="r-field">
        <span>Что происходило перед этим? · необязательно</span>
        <select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          <option value="">Не указывать</option>
          {data.triggers
            .filter((t) => t.product_types.includes(product))
            .map((t) => (
              <option key={t.code} value={t.code}>
                {t.title}
              </option>
            ))}
        </select>
      </label>
      {product === 'cigarette' && (
        <label className="r-field">
          <span>Количество сигарет</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </label>
      )}
      {product === 'vape' && (
        <div className="r-puff">
          <button onClick={() => setPuffs(Math.max(0, puffs - 5))}>−5</button>
          <strong>
            {puffs}
            <small> затяжек</small>
          </strong>
          <button onClick={() => setPuffs(puffs + 5)}>+5</button>
          <button onClick={() => setPuffs(puffs + 10)}>+10</button>
        </div>
      )}
      <div className="r-actions">
        <ShellButton className="primary" onClick={save} disabled={busy}>
          {busy ? 'Сохраняю…' : 'Записать факт'}
        </ShellButton>
        <ShellButton className="ghost" onClick={close}>
          Отмена
        </ShellButton>
      </div>
    </Modal>
  );
}

/**
 * Сила тяги «до».
 *
 * Вынесено из шага «потребность» отдельным компонентом, потому что у ползунка теперь
 * два места: полный экран потребности и свёрнутая подпись на шаге ответа. Значение
 * `craving_before` — вход для craving delta в H-ALIVE-001, и потерять его на коротком
 * пути было бы хуже, чем не сокращать сценарий вовсе.
 */
function CravingBefore({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number) => void;
}) {
  return (
    <div className="r-slider">
      <label>
        <span>Сила тяги</span>
        <b>{value === null ? '—' : `${value}/10`}</b>
      </label>
      <input
        type="range"
        min="0"
        max="10"
        value={value ?? 5}
        aria-valuetext={value === null ? 'не отвечено' : `${value} из 10`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {value === null && <small>Можно не отвечать — тогда это не запишется</small>}
    </div>
  );
}

/**
 * Управляемый сценарий тяги.
 *
 * Экспортируется ради flow-shortcuts.test.tsx: короткие пути через этот сценарий
 * решают, какой экран человек не увидит в момент тяги, и проверять их пересказом
 * кода нельзя — только рендером.
 */
export function Guided({
  session,
  data,
  close,
  saved,
  initialTrigger,
}: {
  session: Session;
  data: Bootstrap;
  close: () => void;
  saved: () => Promise<void>;
  initialTrigger?: string;
}) {
  // Смарт-дефолты сценария: то, что система уже знает по личной истории и потому не
  // переспрашивает. Считается один раз на открытие — пересчёт в момент тяги двигал бы
  // экран под руками. Правила и пороги живут в domain/flow-defaults.ts.
  //
  // Контекст, названный карточкой на Главной, до этого всё равно переспрашивался:
  // значение подставлялось в состояние, а экран выбора показывался поверх него. Теперь
  // он засчитывается как пройденный шаг.
  const [start] = useState(() => flowOpening(data, initialTrigger));
  const [product, setProduct] = useState<ProductType>(start.product);
  const [step, setStep] = useState(start.first);
  const [triggerCode, setTrigger] = useState(start.trigger);
  const [needCode, setNeed] = useState(start.need?.needCode ?? '');
  const [needFromHistory, setNeedFromHistory] = useState<NeedGuess | null>(start.need);
  // Ползунки начинаются с «не отвечено», а не с числа. Предзаполненные 7 / 4 / 3
  // записывались в базу, даже если человек их не трогал: на пилоте из пяти участников
  // это делало craving delta бесполезной, а выглядело как их ответ. См. ADR-0006.
  const [before, setBefore] = useState<number | null>(null);
  const [replacementCode, setReplacement] = useState<string | null>(null);
  const [after, setAfter] = useState<number | null>(null);
  const [help, setHelp] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<'successful_response' | 'nicotine_used' | 'abandoned'>(
    'successful_response',
  );
  const [qty, setQty] = useState(1);
  const [puffs, setPuffs] = useState(10);
  const [busy, setBusy] = useState(false);
  const candidates = useMemo(
    () => (triggerCode && needCode ? pickReplacements(data, product, triggerCode, needCode) : []),
    [data, product, triggerCode, needCode],
  );
  // Экран ответа мог не открыться: тогда показывать было нечего, и в эпизод уходит
  // пустой список, а не «показали ноль вариантов».
  const offerSeen = useRef(false);
  useEffect(() => {
    if (step === 3 && candidates.length) offerSeen.current = true;
  }, [step, candidates.length]);
  const offer = useMemo(() => describeOffer(data, candidates), [data, candidates]);
  const selected = data.replacements.find((r) => r.code === replacementCode);
  const triggers = data.triggers.filter((t) => t.product_types.includes(product));
  // 3–5 личных контекстов наверх сетки; остальные 20+ карточек уезжают за раскрытие
  // (P3). Полный каталог никуда не девается — он перестаёт быть первым, что человек
  // видит в момент тяги.
  const shortlist = useMemo(() => frequentTriggers(data, product), [data, product]);
  const restTriggers = useMemo(
    () =>
      shortlist.length
        ? triggers.filter((t) => !shortlist.some((item) => item.code === t.code))
        : triggers,
    [triggers, shortlist],
  );
  const chosenTrigger = data.triggers.find((t) => t.code === triggerCode) ?? null;
  const chosenNeed = data.needs.find((n) => n.code === needCode) ?? null;
  // One collapsed line above the three suggestions, and only for triggers that have a
  // card opted into the flow surface. Mid-craving is the worst possible moment for a
  // paragraph, so this stays closed until the person chooses to open it.
  const flowCards = useMemo(
    () => cardsForTrigger(data.knowledge, triggerCode, [product], 'flow'),
    [data.knowledge, triggerCode, product],
  );
  // Открытие сценария и уход из него на полпути — единственные два события, которых
  // не видит ни один триггер в базе: в таблицы при этом ничего не пишется. А это самый
  // ценный сигнал воронки: человек нажал «хочу курить» и не дошёл до конца.
  //
  // `savedRef` отличает закрытие после сохранения от ухода. Без него каждый успешный
  // разбор считался бы ещё и брошенным. `stepRef` нужен потому, что размонтирование
  // видит замыкание момента подписки, а знать нужно, где человек остановился.
  const savedRef = useRef(false);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    trackEvent(session.user.id, {
      event_type: 'flow_opened',
      funnel_stage: 'first_episode',
      surface: 'guided_flow',
      product_type: start.product,
      trigger_code: initialTrigger || undefined,
      // Без этого воронка H-ALIVE-001 перестанет быть сравнимой: короткий и полный
      // сценарий дают одинаковую запись эпизода, и по ней не отличить, какой из них
      // человек прошёл.
      metadata: {
        product_prefilled: data.products.length > 1 && start.first > 0,
        trigger_prefilled: Boolean(start.trigger),
        need_prefilled: Boolean(start.need),
      },
    });
    return () => {
      if (savedRef.current) return;
      trackEvent(session.user.id, {
        event_type: 'flow_abandoned',
        funnel_stage: 'first_episode',
        surface: 'guided_flow',
        numeric_value: stepRef.current,
      });
    };
    // Намеренно один раз за открытие сценария: событие про открытие, а не про шаг.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Шаг сценария и время, проведённое на предыдущем.
  //
  // Открытие и уход писались и раньше, но между ними была дыра: где именно человек
  // остановился, знал только `flow_abandoned`, а сколько ему стоил каждый экран — никто.
  // Аудит 26.08 выдвинул гипотезу, что четыре экрана выбора противоречат принципу P17
  // (минимум действий в момент тяги). Спорить о ней без этих чисел можно бесконечно.
  //
  // `duration_ms` здесь — время на **предыдущем** шаге, а не на текущем: событие
  // отправляется при входе на экран, потому что уход с последнего экрана событием
  // не сопровождается вовсе.
  const stepEnteredAt = useRef(Date.now());
  useEffect(() => {
    const enteredAt = Date.now();
    const previous = stepEnteredAt.current;
    stepEnteredAt.current = enteredAt;
    trackEvent(session.user.id, {
      event_type: 'flow_step_view',
      funnel_stage: 'first_episode',
      surface: 'guided_flow',
      numeric_value: step,
      duration_ms: enteredAt - previous,
      product_type: product,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Выбор продукта и выбор контекста — единственные два места, откуда сценарий может
  // перепрыгнуть через экран. Логика перехода собрана здесь, а не в обработчиках
  // кнопок, чтобы «куда дальше» нельзя было починить в одном месте и забыть в другом.
  function chooseTrigger(code: string, forProduct: ProductType = product) {
    setTrigger(code);
    const guess = needGuess(data, forProduct, code);
    setNeedFromHistory(guess);
    setNeed(guess?.needCode ?? '');
    setStep(stepAfterTrigger(guess));
  }

  function triggerCard(t: Trigger) {
    return (
      <button key={t.code} onClick={() => chooseTrigger(t.code)}>
        <span className="r-choice-icon">
          <Icon name={triggerIcon(t)} size={23} />
        </span>
        <strong>{t.title}</strong>
        <small>{t.description}</small>
      </button>
    );
  }

  function chooseProduct(next: ProductType) {
    setProduct(next);
    if (triggerCode) chooseTrigger(triggerCode, next);
    else setStep(1);
  }

  async function save() {
    if (!triggerCode || !needCode) return;
    setBusy(true);
    const tobacco: GuidedEpisodeDraft['tobacco'] =
      outcome === 'nicotine_used'
        ? {
            cigaretteQuantity: product === 'cigarette' ? qty : undefined,
            hookahSessionCount: product === 'hookah' ? 1 : undefined,
            vapePuffs: product === 'vape' ? puffs : undefined,
          }
        : undefined;
    try {
      await saveGuidedEpisode(session, {
        product,
        triggerCode,
        needCode,
        cravingBefore: before,
        cravingAfter: after,
        helpfulness: help,
        replacementCode,
        offeredReplacements: offerSeen.current ? candidates.map((item) => item.code) : [],
        offerPersonalized: offerSeen.current ? offer.personalized : null,
        offerReason: offerSeen.current ? offer.reason : null,
        outcome,
        tobacco,
      });
      savedRef.current = true;
      await saved();
      close();
    } finally {
      setBusy(false);
    }
  }
  const progress = Math.max(1, step);
  return (
    <Modal wide onClose={close}>
      <div className="r-modal-head">
        <div>
          <p className="r-kicker">Не экзамен. Один живой момент.</p>
          <h2>{step < 3 ? 'Что происходит прямо сейчас?' : 'Выбери другой ответ'}</h2>
        </div>
        <button className="r-icon-button" onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      <div className="r-progress">
        <span className={progress >= 1 ? 'done' : ''}>1 · ситуация</span>
        <span className={progress >= 2 ? 'done' : ''}>2 · потребность</span>
        <span className={progress >= 3 ? 'done' : ''}>3 · ответ</span>
        <span className={progress >= 4 ? 'done' : ''}>4 · результат</span>
      </div>
      {step === 0 && (
        <section className="r-flow">
          <h3>К чему сейчас тянет?</h3>
          <div className="r-choice-grid products">
            {data.products.map((p) => (
              <button key={p.product_type} onClick={() => chooseProduct(p.product_type)}>
                <Icon name={productIcon(p.product_type)} size={28} />
                <strong>{productLabel(p.product_type)}</strong>
              </button>
            ))}
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="r-flow">
          <div className="r-flow-title">
            <span className="r-step-icon observe">
              <Icon name="eye" />
            </span>
            <div>
              <h3>В каком контексте включилась тяга?</h3>
              <p>Ищем момент, который повторяется.</p>
            </div>
          </div>
          {data.products.length > 1 && (
            <div className="r-flow-prefill">
              <p>
                <Icon name={productIcon(product)} size={17} />
                <b>{productLabel(product)}</b>
                {start.productConfident && <small>Последние разборы были про это</small>}
              </p>
              <div className="r-flow-prefill-actions">
                <button type="button" onClick={() => setStep(0)}>
                  Другой продукт
                </button>
              </div>
            </div>
          )}
          {/* Личные контексты наверх, остальной каталог остаётся ниже и остаётся
              одним тапом: прятать его за раскрытие означало бы добавить действие
              ровно тем, у кого сегодня новый контекст, — то есть нарушить P17 в
              попытке его соблюсти. */}
          {shortlist.length > 0 && (
            <>
              <p className="r-flow-hint personal">Чаще всего у тебя включается здесь</p>
              <div className="r-choice-grid">{shortlist.map((t) => triggerCard(t))}</div>
              <p className="r-flow-hint">Остальные контексты</p>
            </>
          )}
          <div className="r-choice-grid">{restTriggers.map((t) => triggerCard(t))}</div>
        </section>
      )}
      {step === 2 && (
        <section className="r-flow">
          <div className="r-flow-title">
            <span className="r-step-icon">
              <Icon name="heart" />
            </span>
            <div>
              <h3>Что ты на самом деле сейчас ищешь?</h3>
              <p>
                Сигарета обещает паузу, разрядку, завершение, стимуляцию или контакт. Что из этого
                сейчас?
              </p>
            </div>
          </div>
          <div className="r-choice-grid needs">
            {data.needs.map((n) => (
              <button
                key={n.code}
                onClick={() => {
                  setNeed(n.code);
                  setNeedFromHistory(null);
                  setStep(3);
                }}
              >
                <span className="r-choice-icon">
                  <Icon name={needIcon(n.code, n.title)} size={24} />
                </span>
                <strong>{n.title}</strong>
                <small>{n.description}</small>
              </button>
            ))}
          </div>
          <CravingBefore value={before} onChange={setBefore} />
        </section>
      )}
      {step === 3 && (
        <section className="r-flow">
          <div className="r-flow-title">
            <span className="r-step-icon accent">
              <Icon name="spark" />
            </span>
            <div>
              <h3>Три варианта под этот момент</h3>
              <p>
                Подобраны под твой контекст и потребность. Порядок будет меняться по твоим
                результатам.
              </p>
            </div>
          </div>
          {needFromHistory && (
            <div className="r-flow-prefill collapsed">
              <p>
                <Icon name="eye" size={17} />
                <b>{chosenTrigger?.title ?? 'Контекст'}</b>
                <span aria-hidden="true">·</span>
                <b>{chosenNeed?.title ?? 'Потребность'}</b>
              </p>
              <small>
                {`Так было в ${needFromHistory.episodes} из ${needFromHistory.total} ` +
                  `${plural(needFromHistory.total, 'разбора', 'разборов', 'разборов')} ` +
                  'этого контекста. В эпизод запишется так же.'}
              </small>
              <div className="r-flow-prefill-actions">
                <button type="button" onClick={() => setStep(1)}>
                  Другой контекст
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNeedFromHistory(null);
                    setStep(2);
                  }}
                >
                  Другая потребность
                </button>
              </div>
              <CravingBefore value={before} onChange={setBefore} />
            </div>
          )}
          <FlowMeaning data={data} />
          {flowCards.map((card) => (
            <KnowledgeCollapsed key={card.code} knowledge={data.knowledge} card={card} />
          ))}
          <div className="r-replacement-grid">
            {candidates.map((r) => (
              <button
                key={r.code}
                onClick={() => {
                  setReplacement(r.code);
                  setStep(4);
                }}
              >
                <span className="r-big-icon">
                  <Icon name={replacementIcon(r)} size={30} />
                </span>
                <div>
                  <span className="r-kind">
                    {replacementKind(r)}
                    {r.duration ? ` · ${r.duration}` : ''}
                  </span>
                  <h3>{r.title}</h3>
                  <p>{r.summary || r.instruction}</p>
                  <EvidenceBadge knowledge={data.knowledge} replacement={r} />
                </div>
                <Icon name="arrow" className="r-card-arrow" size={20} />
              </button>
            ))}
          </div>
          <button
            className="r-skip"
            onClick={() => {
              setReplacement(null);
              setStep(4);
            }}
          >
            Сейчас не хочу пробовать замену
          </button>
        </section>
      )}
      {step === 4 && (
        <section className="r-flow">
          <div className={selected ? 'r-result-choice' : 'r-result-choice observe'}>
            {selected ? (
              <>
                <span className="r-big-icon">
                  <Icon name={replacementIcon(selected)} size={30} />
                </span>
                <div>
                  <small>Твой ответ</small>
                  <h3>{selected.title}</h3>
                  <p>{selected.instruction}</p>
                  {/* The full evidence lives here rather than on the choice cards:
                      the decision is already made, so this informs without pressuring
                      it, and a details element cannot legally sit inside a button. */}
                  <EvidenceDetail knowledge={data.knowledge} replacement={selected} />
                </div>
              </>
            ) : (
              <>
                <span className="r-big-icon">
                  <Icon name="pause" size={30} />
                </span>
                <div>
                  <small>Без замены</small>
                  <h3>Только наблюдение</h3>
                </div>
              </>
            )}
          </div>
          <div className="r-two-sliders">
            <div className="r-slider">
              <label>
                <span>Тяга после</span>
                <b>{after === null ? '—' : `${after}/10`}</b>
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={after ?? 5}
                aria-valuetext={after === null ? 'не отвечено' : `${after} из 10`}
                onChange={(e) => setAfter(Number(e.target.value))}
              />
            </div>
            <div className="r-slider">
              <label>
                <span>Насколько помогло</span>
                <b>{help === null ? '—' : `${help}/5`}</b>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={help ?? 3}
                aria-valuetext={help === null ? 'не отвечено' : `${help} из 5`}
                onChange={(e) => setHelp(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="r-outcomes">
            <button
              className={outcome === 'successful_response' ? 'selected success' : ''}
              onClick={() => setOutcome('successful_response')}
            >
              <Icon name="check" size={22} />
              <div>
                <strong>Автоматизм прерван</strong>
                <small>Никотиновый ответ не последовал</small>
              </div>
            </button>
            <button
              className={outcome === 'nicotine_used' ? 'selected used' : ''}
              onClick={() => setOutcome('nicotine_used')}
            >
              <Icon name={productIcon(product)} size={22} />
              <div>
                <strong>Никотин был</strong>
                <small>Это данные. Никотин не считается заменой</small>
              </div>
            </button>
            <button
              className={outcome === 'abandoned' ? 'selected' : ''}
              onClick={() => setOutcome('abandoned')}
            >
              <Icon name="pause" size={22} />
              <div>
                <strong>Просто закрыть</strong>
                <small>Без оценки результата</small>
              </div>
            </button>
          </div>
          {outcome === 'successful_response' && (
            <ShareWin replacementTitle={selected?.title ?? null} />
          )}
          {outcome === 'nicotine_used' && (
            <div className="r-nicotine-detail">
              <p>
                <b>Продукт записывается отдельно.</b> В «Замену» он не попадёт.
              </p>
              {product === 'cigarette' && (
                <label className="r-field">
                  <span>Количество сигарет</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                  />
                </label>
              )}
              {product === 'vape' && (
                <div className="r-puff">
                  <button onClick={() => setPuffs(Math.max(0, puffs - 5))}>−5</button>
                  <strong>
                    {puffs}
                    <small> затяжек</small>
                  </strong>
                  <button onClick={() => setPuffs(puffs + 5)}>+5</button>
                </div>
              )}
            </div>
          )}
          <div className="r-actions">
            <ShellButton className="primary" onClick={save} disabled={busy}>
              {busy ? 'Сохраняю…' : 'Сохранить эпизод'} <Icon name="arrow" size={18} />
            </ShellButton>
            <ShellButton className="ghost" onClick={() => setStep(3)}>
              Выбрать другой ответ
            </ShellButton>
          </div>
        </section>
      )}
    </Modal>
  );
}

function Evening({
  session,
  data,
  close,
  saved,
}: {
  session: Session;
  data: Bootstrap;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const old = data.todayCheckin;
  const [irritability, setIrritability] = useState(old?.irritability ?? 5);
  const [energy, setEnergy] = useState(old?.energy ?? 5);
  const [recovery, setRecovery] = useState(old?.recovery ?? 5);
  const [owned, setOwned] = useState(old?.owned_moment ?? '');
  const [strongest, setStrongest] = useState(old?.strongest_link ?? '');
  const [tomorrow, setTomorrow] = useState(old?.tomorrow_plan ?? '');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await saveCheckin(session, {
        checkin_date: localDay(),
        irritability,
        energy,
        recovery,
        owned_moment: owned || null,
        strongest_link: strongest || null,
        tomorrow_plan: tomorrow || null,
      });
      await saved();
      close();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal onClose={close}>
      <div className="r-modal-head">
        <div>
          <p className="r-kicker">Итоги дня · 3 минуты</p>
          <h2>Карта дня, а не его оценка</h2>
        </div>
        <button className="r-icon-button" onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      {[
        ['Раздражительность', irritability, setIrritability],
        ['Энергия', energy, setEnergy],
        ['Восстановление', recovery, setRecovery],
      ].map(([label, value, setter]) => (
        <div className="r-slider" key={String(label)}>
          <label>
            <span>{String(label)}</span>
            <b>{Number(value)}/10</b>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={Number(value)}
            onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))}
          />
        </div>
      ))}
      <label className="r-field">
        <span>Где сегодня решение особенно осталось твоим?</span>
        <textarea value={owned} onChange={(e) => setOwned(e.target.value)} />
      </label>
      <label className="r-field">
        <span>Какая Связка была самой сильной?</span>
        <textarea value={strongest} onChange={(e) => setStrongest(e.target.value)} />
      </label>
      <label className="r-field">
        <span>Завтра: если X, то Y</span>
        <textarea
          value={tomorrow}
          onChange={(e) => setTomorrow(e.target.value)}
          placeholder="Если после кофе потянет — сначала две минуты у окна"
        />
      </label>
      <div className="r-actions">
        <ShellButton className="primary" onClick={save} disabled={busy}>
          {busy ? 'Сохраняю…' : 'Сохранить итоги'}
        </ShellButton>
      </div>
    </Modal>
  );
}

function Today({
  session,
  data,
  reload,
  openFlow,
  openQuick,
  openEvening,
}: {
  session: Session;
  data: Bootstrap;
  reload: () => Promise<void>;
  openFlow: (trigger?: string) => void;
  openQuick: () => void;
  openEvening: () => void;
}) {
  const today = statsForDays(data, 1);
  const week = statsForDays(data, 7);
  const tstats = triggerStats(data);
  // Rotated by calendar day, not at random: opening Сегодня three times must not
  // produce three different claims about your health.
  const todayCard = cardOfTheDay(
    data.knowledge,
    'today',
    localDay(),
    data.products.map((p) => p.product_type),
  );
  const support = data.supports.filter((s) => s.support_type === 'daily');
  const phrase = support.length ? support[new Date().getDate() % support.length]?.body : null;
  const weak = tstats
    .filter((x) => x.episodes > 0)
    .sort((a, b) => (a.successRate ?? 101) - (b.successRate ?? 101))
    .slice(0, 3);
  const fallback = data.triggers
    .filter((t) => data.products.some((p) => t.product_types.includes(p.product_type)))
    .slice(0, 3);
  const attention = weak.length ? weak.map((x) => x.trigger) : fallback;
  async function remove(id: string) {
    if (
      !window.confirm(
        'Удалить ошибочную или тестовую запись? Все показатели пересчитаются автоматически.',
      )
    )
      return;
    await deleteEpisode(session, id);
    await reload();
  }
  const delta = week.baselineDeltaPct;
  return (
    <main className="r-page">
      <section className="r-now">
        <div className="r-now-copy">
          <p className="r-kicker">Сегодня · {data.profile.display_name}</p>
          <h1>
            {today.successfulResponses > 0
              ? `Сегодня выбор уже ${today.successfulResponses === 1 ? 'один раз' : 'несколько раз'} остался твоим`
              : 'Достаточно одного замеченного момента'}
          </h1>
          <p>
            {data.settings.goal_text ||
              'Следующий момент, в котором автоматизм замечен чуть раньше обычного, — уже результат'}
          </p>
          {phrase && <blockquote>{phrase}</blockquote>}
        </div>
        <div className="r-now-actions">
          <button className="r-craving" onClick={() => openFlow()} aria-describedby="cta-vape-note">
            <span className="r-craving-icon">
              <Icon name="spark" size={30} />
            </span>
            <span>
              <small>Когда важно действовать прямо сейчас</small>
              <strong>
                Хочу курить<sup aria-hidden="true">*</sup>
              </strong>
              <em>Разобрать момент и выбрать другой ответ</em>
            </span>
            <Icon name="arrow" size={24} />
          </button>
          <p className="r-cta-note" id="cta-vape-note">
            <span aria-hidden="true">*</span> для вэйперов, конечно же, — парить
          </p>
          <div className="r-secondary-actions">
            <button onClick={openQuick}>
              <Icon name="smoke" />
              <span>
                <strong>Никотин уже был</strong>
                <small>Просто записать факт</small>
              </span>
            </button>
            <button onClick={openEvening}>
              <Icon name="journal" />
              <span>
                <strong>Итоги дня</strong>
                <small>{data.todayCheckin ? 'Можно дополнить' : '3 минуты вечером'}</small>
              </span>
            </button>
          </div>
        </div>
      </section>
      {/* Стоит сразу под главным действием и держится, пока человек не поставит
          ярлык или не откажется. Решение о показе живёт внутри компонента. */}
      <InstallPrompt />
      <section className="r-pulse">
        <div className="r-pulse-main">
          <span className="r-pulse-icon">
            <Icon name="check" size={26} />
          </span>
          <div>
            <small>Осознанных ответов сегодня</small>
            <strong>{today.successfulResponses}</strong>
            <p>
              {today.successfulResponses
                ? 'Моменты, где старый сценарий не решил за тебя.'
                : 'Первая запись появится после реального эпизода — ничего специально создавать не нужно.'}
            </p>
          </div>
        </div>
        <div className="r-pulse-stat">
          <small>7 дней к исходному уровню</small>
          <strong>{delta === null ? '—' : `${delta > 0 ? '+' : ''}${fmt(delta)}%`}</strong>
          <span>
            {delta !== null && delta < 0
              ? 'Никотиновая интенсивность ниже исходной'
              : delta !== null && delta > 0
                ? 'Пока выше исходной — это наблюдение, а не оценка'
                : 'Нужно больше данных'}
          </span>
        </div>
        <div className="r-pulse-stat">
          <small>Фонд свободы · 7 дней</small>
          <strong>{week.baselineCost > 0 ? money(week.freedomFund) : '—'}</strong>
          <span>Оценка по твоим расходам и исходному уровню</span>
        </div>
      </section>
      {todayCard && (
        <section className="r-section plain">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Факты</p>
              <h2>Одна опора на сегодня</h2>
              <p>
                Только то, что известно. Карточка меняется раз в сутки и не подстраивается под твои
                результаты — она не реагирует на твой день.
              </p>
            </div>
            <button onClick={() => go('/knowledge')}>
              Весь раздел <Icon name="arrow" size={16} />
            </button>
          </div>
          <KnowledgeCardView knowledge={data.knowledge} card={todayCard} />
        </section>
      )}
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker observe">Карта внимания</p>
            <h2>Где автоматизм сейчас сильнее всего</h2>
            <p>Места, где следующий эксперимент даст больше всего информации.</p>
          </div>
          <button onClick={() => go('/links')}>
            Все Связки <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="r-attention-grid">
          {attention.map((t) => {
            const st = tstats.find((x) => x.trigger.code === t.code);
            return (
              <button key={t.code} onClick={() => openFlow(t.code)}>
                <span className="r-choice-icon">
                  <Icon name={triggerIcon(t)} size={24} />
                </span>
                <div>
                  <strong>{t.title}</strong>
                  <p>{t.description}</p>
                  <small>
                    {st?.episodes
                      ? `${st.episodes} эпиз. · ${st.successRate === null ? 'мало данных' : `${fmt(st.successRate)}% прервано`}`
                      : 'Ещё не изучено'}
                  </small>
                </div>
                <Icon name="arrow" size={18} />
              </button>
            );
          })}
        </div>
      </section>
      <section className="r-section plain">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">История обучения</p>
            <h2>Последние эпизоды</h2>
            <p>
              Теперь карточка разделяет контекст, реальную замену и итог. Сигарета, кальян или
              электронка никогда не называются заменой.
            </p>
          </div>
          {data.episodes.length > 2 && (
            <button onClick={() => go('/path')}>
              Весь путь · {data.episodes.length} <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
        {data.episodes.length ? (
          <div className="r-episode-list">
            {data.episodes.slice(0, 2).map((e) => (
              <EpisodeCard key={e.id} data={data} episode={e} remove={remove} />
            ))}
          </div>
        ) : (
          <div className="r-empty">
            <Icon name="chain" size={30} />
            <h3>Пока нет живых эпизодов</h3>
            <p>
              Ничего не нужно заполнять «для статистики». Используй Habitoff в следующий настоящий
              момент тяги.
            </p>
            <ShellButton className="primary small" onClick={() => openFlow()}>
              Разобрать первый момент
            </ShellButton>
          </div>
        )}
      </section>
    </main>
  );
}

function Links({
  session,
  data,
  reload,
  openFlow,
}: {
  session: Session;
  data: Bootstrap;
  reload: () => Promise<void>;
  openFlow: (trigger?: string) => void;
}) {
  const stats = triggerStats(data);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [situation, setSituation] = useState('');
  const [need, setNeed] = useState('');
  const [replacement, setReplacement] = useState('');
  async function add() {
    if (!title.trim() || !situation.trim()) return;
    await addLink(session, {
      title: title.trim(),
      situation: situation.trim(),
      need_code: need || null,
      impulse: null,
      habitual_response: null,
      preferred_replacement_code: replacement || null,
    });
    setShow(false);
    setTitle('');
    setSituation('');
    await reload();
  }
  async function remove(id: string) {
    if (window.confirm('Удалить эту личную Связку?')) {
      await deleteLink(session, id);
      await reload();
    }
  }
  return (
    <main className="r-page">
      <section className="r-title">
        <p className="r-kicker">Связки</p>
        <h1>Ситуация → потребность → привычный ответ</h1>
        <p>
          Помнить все триггеры не нужно. Достаточно увидеть несколько повторяющихся сценариев и
          научиться возвращать нужное состояние напрямую.
        </p>
        <ShellButton className="ghost" onClick={() => setShow(!show)}>
          <Icon name="plus" size={18} /> Моя Связка
        </ShellButton>
      </section>
      {show && (
        <section className="r-section r-form">
          <h2>Добавить личную Связку</h2>
          <div className="r-inline-fields">
            <label className="r-field">
              <span>Короткое название</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Кофе после завтрака"
              />
            </label>
            <label className="r-field">
              <span>Что происходит?</span>
              <input value={situation} onChange={(e) => setSituation(e.target.value)} />
            </label>
          </div>
          <label className="r-field">
            <span>Что я в этот момент ищу?</span>
            <select value={need} onChange={(e) => setNeed(e.target.value)}>
              <option value="">Пока не знаю</option>
              {data.needs.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.title}
                </option>
              ))}
            </select>
          </label>
          <label className="r-field">
            <span>Какой ответ хочу попробовать первым?</span>
            <select value={replacement} onChange={(e) => setReplacement(e.target.value)}>
              <option value="">Пусть Habitoff подбирает по ситуации</option>
              {data.replacements.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <div className="r-actions">
            <ShellButton className="primary" onClick={add}>
              Сохранить Связку
            </ShellButton>
            <ShellButton className="ghost" onClick={() => setShow(false)}>
              Отмена
            </ShellButton>
          </div>
        </section>
      )}
      {data.userLinks.length > 0 && (
        <section className="r-section">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Личные</p>
              <h2>Твои собственные сценарии</h2>
            </div>
          </div>
          <div className="r-personal-links">
            {data.userLinks.map((l) => {
              const needObj = data.needs.find((n) => n.code === l.need_code);
              const repl = data.replacements.find((r) => r.code === l.preferred_replacement_code);
              return (
                <article key={l.id}>
                  <span className="r-choice-icon">
                    <Icon name="chain" />
                  </span>
                  <div>
                    <h3>{l.title}</h3>
                    <p>{l.situation}</p>
                    <small>
                      {needObj ? `Ищу: ${needObj.title}` : 'Потребность ещё не определена'}
                      {repl ? ` · первый ответ: ${repl.title}` : ''}
                    </small>
                  </div>
                  <div className="r-card-tools">
                    <button onClick={() => openFlow()} title="Проверить сейчас">
                      <Icon name="spark" />
                    </button>
                    <button
                      onClick={() => submitLink(session, l)}
                      title="Предложить обезличенную версию в общую базу"
                    >
                      <Icon name="plus" />
                    </button>
                    <button onClick={() => remove(l.id)} title="Удалить">
                      <Icon name="trash" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker observe">Карта контекстов</p>
            <h2>Что система уже видит</h2>
          </div>
        </div>
        {/* Связка — это триггер и замены под него. Карточки знания стояли здесь до
            24.08 и уехали в «Факты»: миф — утверждение о мире, а не свойство момента,
            и на карте контекстов он отвлекал от того, ради чего человек сюда пришёл. */}
        <div className="r-trigger-grid">
          {data.triggers.map((t) => {
            const st = stats.find((x) => x.trigger.code === t.code);
            return (
              <button className="r-trigger-card" key={t.code} onClick={() => openFlow(t.code)}>
                <span className="r-choice-icon">
                  <Icon name={triggerIcon(t)} size={23} />
                </span>
                <div>
                  <strong>{t.title}</strong>
                  <p>{t.description}</p>
                </div>
                <span className="r-rate">
                  {st?.episodes ? `${fmt(st.successRate ?? 0)}%` : 'новое'}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function PathPage({ data }: { data: Bootstrap }) {
  const week = statsForDays(data, 7);
  const month = statsForDays(data, 30);
  const days = dailyUnits(data, 7);
  const rstats = replacementStats(data).slice(0, 6);
  const max = Math.max(1, ...days.map((d) => d.units));
  // «Путь» — единственный момент, где уместно говорить о траектории, а не о ближайших
  // минутах. Редакция это уже решила: карточки приходят с moment = 'путь', и код лишь
  // выполняет решение, а не повторяет его.
  const products = data.products.map((p) => p.product_type);
  const trajectory = awarenessForMoment(data.awareness, 'путь', products);
  return (
    <main className="r-page">
      <section className="r-title">
        <p className="r-kicker">Путь</p>
        <h1>Не счётчик дней, а изменения в системе</h1>
        <p>
          Главные сигналы: интенсивность относительно твоего исходного уровня, прерванные Связки и
          ответы, которые реально помогают.
        </p>
      </section>
      <section className="r-path-summary">
        <div>
          <small>7 дней · к исходному уровню</small>
          <strong>
            {week.baselineDeltaPct === null
              ? '—'
              : `${week.baselineDeltaPct > 0 ? '+' : ''}${fmt(week.baselineDeltaPct)}%`}
          </strong>
          <p>{week.successfulResponses} осознанных ответов</p>
        </div>
        <div>
          <small>30 дней · к исходному уровню</small>
          <strong>
            {month.baselineDeltaPct === null
              ? '—'
              : `${month.baselineDeltaPct > 0 ? '+' : ''}${fmt(month.baselineDeltaPct)}%`}
          </strong>
          <p>{month.activeDays} активных дней</p>
        </div>
        <div>
          <small>Фонд свободы · 30 дней</small>
          <strong>{month.baselineCost ? money(month.freedomFund) : '—'}</strong>
          <p>без обещаний и «штрафов»</p>
        </div>
      </section>
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Последние 7 дней</p>
            <h2>Никотиновая интенсивность и новые ответы</h2>
          </div>
        </div>
        <div className="r-chart">
          {days.map((d) => (
            <div className="r-chart-day" key={d.date}>
              <div className="r-bars">
                <i style={{ height: `${Math.max(5, (d.units / max) * 100)}%` }} />
                <b style={{ height: `${Math.max(0, Math.min(100, d.successes * 22))}%` }} />
              </div>
              <small>{new Date(d.date).toLocaleDateString('ru-RU', { weekday: 'short' })}</small>
              <span>{fmt(d.units, 1)}</span>
            </div>
          ))}
        </div>
        <div className="r-legend">
          <span>
            <i className="use" />
            единицы Habitoff
          </span>
          <span>
            <i className="success" />
            прерванные Связки
          </span>
        </div>
      </section>
      {trajectory.length > 0 && (
        <section className="r-section">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Куда это ведёт</p>
              <h2>Что известно про траекторию, а не про сегодняшний день</h2>
              <p>
                Графики выше показывают твои недели. Здесь — то, что известно про сам путь: как
                меняется риск и почему первые месяцы уже относятся к другой траектории.
              </p>
            </div>
          </div>
          <div className="r-awareness-grid">
            {trajectory.map((card) => (
              <AwarenessCardView key={card.code} card={card} />
            ))}
          </div>
        </section>
      )}
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Что работает для тебя</p>
            <h2>Эффективность реальных замен</h2>
          </div>
        </div>
        {rstats.length ? (
          <div className="r-effect-list">
            {rstats.map((r, i) => (
              <div key={r.code}>
                <span>{i + 1}</span>
                <div>
                  <strong>{r.title}</strong>
                  <small>
                    {r.uses} использ. · тяга в среднем{' '}
                    {r.avgCravingDelta === null ? '—' : `−${fmt(r.avgCravingDelta, 1)}`}
                  </small>
                </div>
                <b>{r.avgHelpfulness === null ? '—' : `${fmt(r.avgHelpfulness, 1)}/5`}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="r-empty compact">
            <Icon name="spark" />
            <p>После нескольких эпизодов здесь появятся именно твои рабочие ответы.</p>
          </div>
        )}
      </section>
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Исходные факты · 30 дней</p>
            <h2>Без смешивания продуктов</h2>
          </div>
        </div>
        <div className="r-raw">
          <div>
            <Icon name="smoke" />
            <small>Сигареты</small>
            <strong>{fmt(month.cigarettes, 1)}</strong>
          </div>
          <div>
            <Icon name="hookah" />
            <small>Кальянные сессии</small>
            <strong>{fmt(month.hookahs, 1)}</strong>
          </div>
          <div>
            <Icon name="vape" />
            <small>Затяжки электронной сигареты</small>
            <strong>{fmt(month.vapePuffs)}</strong>
          </div>
        </div>
        <p className="r-footnote">
          Единицы Habitoff нужны только для внутренней динамики. Они не означают равный медицинский
          вред.
        </p>
      </section>
    </main>
  );
}

/**
 * The «зачем» line inside the craving flow.
 *
 * The Смыслы section is worth nothing if it only exists on its own page: the moment a
 * person needs their reason is the moment they are choosing a replacement, not the
 * moment they browse a library. Their own wording wins over the Habitoff catalog whenever
 * they have any, and the catalog card only fills the silence.
 */
function FlowMeaning({ data }: { data: Bootstrap }) {
  const mine = data.userMeanings.filter((m) => m.active);
  const today = new Date().toISOString().slice(0, 10);
  if (mine.length) {
    const pick = mine[new Date().getDate() % mine.length];
    return (
      <p className="r-flow-meaning">
        <Icon name="meaning" size={15} />
        <span>{pick.title}</span>
      </p>
    );
  }
  const goal = goalOfTheDay(data.goals, today);
  if (!goal) return null;
  // Здесь стоит название смысла, а не вопрос из его карточки. Вопрос
  // (`reflection_prompt_ru`) написан для библиотеки, где на него садятся и отвечают;
  // в потоке тяги он просит работы там, где человек выбирает действие, и вдобавок
  // приходит из смысла дня, а не из разобранного момента — поэтому читается как
  // случайный. Личные формулировки показываются здесь заголовком, каталожные теперь
  // тоже: один жанр в одном месте.
  return (
    <p className="r-flow-meaning">
      <Icon name="meaning" size={15} />
      <span>{goal.title_ru}</span>
    </p>
  );
}

function Meanings({
  session,
  data,
  reload,
}: {
  session: Session;
  data: Bootstrap;
  reload: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const spotlight = goalOfTheDay(data.goals, new Date().toISOString().slice(0, 10));
  const active = data.userMeanings.filter((m) => m.active).length;
  async function add() {
    if (!title.trim() || !body.trim()) return;
    await addMeaning(session, title.trim(), body.trim());
    setAdding(false);
    setTitle('');
    setBody('');
    await reload();
  }
  // Taking a library card does not save it: it opens the editor with someone else's
  // wording already in the fields, so the person edits a draft instead of facing an
  // empty box. What lands in the database is always their own text.
  function take(goal: Goal) {
    setTitle(goal.title_ru);
    setBody(goal.body_ru);
    setAdding(true);
    window.requestAnimationFrame(() =>
      document
        .getElementById('r-meaning-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  }
  async function remove(id: string) {
    if (window.confirm('Удалить эту цель?')) {
      await deleteMeaning(session, id);
      await reload();
    }
  }
  async function toggle(m: UserMeaning) {
    await updateMeaning(session, m.id, { active: !m.active });
    await reload();
  }
  return (
    <main className="r-page">
      <section className="r-title meaning">
        <p className="r-kicker">Смыслы</p>
        <h1>Ради чего становится интереснее жить иначе</h1>
        <p className="r-lead">
          Здесь ты формулируешь, какая жизнь тебе нужна. И когда мозг предложит старый сценарий, у
          тебя будет что ответить по существу, а не силой воли.
        </p>
        <div className="r-meaning-stats">
          <span>
            <b>{active}</b>
            {` ${plural(active, 'твоя', 'твои', 'твоих')} ${plural(active, 'формулировка', 'формулировки', 'формулировок')}`}
          </span>
          <span>
            <b>{data.goals.length}</b> {plural(data.goals.length, 'смысл', 'смысла', 'смыслов')} в
            библиотеке
          </span>
        </div>
        <ShellButton className="ghost" onClick={() => setAdding(!adding)}>
          <Icon name="plus" size={18} /> Добавить свою цель
        </ShellButton>
      </section>
      {spotlight && <GoalSpotlight goal={spotlight} onTake={take} />}
      {adding && (
        <section className="r-section r-form" id="r-meaning-form">
          <label className="r-field">
            <span>Цель одной строкой</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Хочу дышать полной грудью на подъёме, а не считать этажи"
            />
          </label>
          <label className="r-field">
            <span>Что изменится, когда это станет правдой</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <div className="r-actions">
            <ShellButton className="primary" onClick={add}>
              Сохранить
            </ShellButton>
            <ShellButton className="ghost" onClick={() => setAdding(false)}>
              Отмена
            </ShellButton>
          </div>
        </section>
      )}
      {data.userMeanings.length > 0 && (
        <section className="r-section">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Твои</p>
              <h2>То, ради чего ты это делаешь</h2>
              <p>
                Это твои формулировки, и они появляются в потоке тяги в тот момент, когда важнее
                всего вспомнить, куда ты идёшь.
              </p>
            </div>
          </div>
          <div className="r-meaning-grid personal">
            {data.userMeanings.map((m) => (
              <article key={m.id} className={!m.active ? 'inactive' : ''}>
                <span className="r-meaning-symbol">
                  <Icon name="meaning" size={25} />
                </span>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
                <div className="r-meaning-actions">
                  <button onClick={() => toggle(m)}>{m.active ? 'Скрыть' : 'Вернуть'}</button>
                  <button onClick={() => submitMeaning(session, m)}>Предложить в общую базу</button>
                  <button onClick={() => remove(m.id)}>Удалить</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Библиотека Habitoff</p>
            <h2>Чужие смыслы, которые можно примерить на себя</h2>
            <p>
              Если своя формулировка пока не находится — возьми ту, что откликается, и перепиши её
              под себя. Чужая цель здесь не образец, а способ нащупать свою. У каждой карточки есть
              вопрос: на него отвечать интереснее, чем соглашаться с лозунгом.
            </p>
          </div>
        </div>
        <GoalLibrary goals={data.goals} onTake={take} />
      </section>
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Перепись сценария</p>
            <h2>От автоматизма к своему выбору</h2>
          </div>
        </div>
        <div className="r-scripts">
          {data.identityScripts.map((s) => (
            <details key={s.code}>
              <summary>{s.title}</summary>
              <div>
                <span>
                  <small>Старый сценарий</small>
                  {s.old_pattern}
                </span>
                <Icon name="arrow" />
                <span>
                  <small>Новый выбор</small>
                  {s.new_choice}
                </span>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

/**
 * «Факты» — the section itself.
 *
 * Named «Факты» rather than «Факты и Мифы» (owner, 2026-08-24): the nav chip already
 * said «Факты», and a section whose name is half a disclaimer reads as defensive. Myths
 * are a kind of card inside it, not half the title.
 *
 * Facts first, myths second, and a short preamble that says what the letters mean
 * before any of them appear. A grade shown without its scale is just a shape.
 */
function KnowledgePage({ data }: { data: Bootstrap }) {
  const products = data.products.map((p) => p.product_type);
  const { facts, myths } = splitByKind(
    data.knowledge.cards.filter(
      (card) => !products.length || card.product_types.some((type) => products.includes(type)),
    ),
  );
  return (
    <main className="r-page">
      <div className="r-title">
        <p className="r-kicker">Факты</p>
        <h1>Что известно — и где это заканчивается</h1>
        <p className="r-lead">
          Здесь нет мотивационных цитат. Каждая карточка говорит, что показывают исследования, чего
          они не показывают, и что из этого следует именно для тебя. Если источника нет — так и
          написано.
        </p>
      </div>

      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Как читать значки</p>
            <h2>Уровень доказательности</h2>
          </div>
        </div>
        <div className="r-level-legend">
          {data.knowledge.levels.map((level) => (
            <article key={level.code}>
              <span className={`r-evidence-badge level-${level.code.toLowerCase()}`}>
                <b>{level.code}</b>
                {level.label_ru}
              </span>
              <p>{level.claim_ru}</p>
              <p className="r-evidence-limit">{level.limit_ru}</p>
            </article>
          ))}
        </div>
      </section>

      {facts.length > 0 && (
        <section className="r-section">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Проверенное</p>
              <h2>
                {facts.length} {plural(facts.length, 'вещь', 'вещи', 'вещей')}, которые стоит знать
              </h2>
            </div>
          </div>
          <div className="r-knowledge-grid">
            {facts.map((card) => (
              <KnowledgeCardView key={card.code} knowledge={data.knowledge} card={card} />
            ))}
          </div>
        </section>
      )}

      {myths.length > 0 && (
        <section className="r-section">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Опровергнутое</p>
              <h2>
                {myths.length} {plural(myths.length, 'убеждение', 'убеждения', 'убеждений')},
                которые не подтверждаются
              </h2>
              <p>
                Заголовок каждой карточки — это то, что часто говорят, а не то, что утверждает
                Habitoff. Разбор — ниже.
              </p>
            </div>
          </div>
          <div className="r-knowledge-grid">
            {myths.map((card) => (
              <KnowledgeCardView key={card.code} knowledge={data.knowledge} card={card} />
            ))}
          </div>
        </section>
      )}

      {!facts.length && !myths.length && (
        <section className="r-section">
          <p className="r-kicker">Раздел не загрузился</p>
          <p>Карточки не пришли из базы. Это не значит, что их нет — попробуй обновить страницу.</p>
        </section>
      )}
    </main>
  );
}

function Experiment() {
  return (
    <main className="r-reading">
      <Brand compact />
      <article>
        <p className="r-kicker">Эксперимент над автоматизмом</p>
        <h1>Habitoff ничего тебе не обещает</h1>
        <p className="r-lead">
          Мы проверяем простую гипотезу: если достаточно раз заметить повторяющуюся Связку, понять
          её функцию и удовлетворить ту же потребность другим ответом, автоматический сценарий может
          стать слабее.
        </p>
        <h2>Что здесь считается успехом</h2>
        <p>
          Не только «день без сигарет». Важны снижение интенсивности относительно своего исходного
          уровня, замеченные моменты тяги, прерванные Связки, рабочие Замены, увеличение промежутков
          без продукта и возвращение в систему после употребления.
        </p>
        <h2>Что известно, а что является гипотезой Habitoff</h2>
        <div className="r-evidence">
          <div>
            <b>Хорошо подтверждено</b>
            <p>
              Никотиновая зависимость формирует устойчивые контекстные и поведенческие ассоциации;
              отказ от курения снижает риски для здоровья.
            </p>
          </div>
          <div>
            <b>Правдоподобно</b>
            <p>
              Работа с триггерами, альтернативным поведением и осознаванием функции ритуала может
              помогать менять привычные ответы.
            </p>
          </div>
          <div>
            <b>Эксперимент Habitoff</b>
            <p>
              Наша конкретная система Связок, Смыслов, персонального ранжирования Замен и единиц
              Habitoff — собственная продуктовая гипотеза, которую нужно проверять на данных.
            </p>
          </div>
        </div>
        <h2>Безопасность и медицина</h2>
        <p>
          Habitoff не является лечением и не заменяет врача, психотерапию или доказательные методы
          отказа от табака. Никотин-заместительная терапия учитывается как поддержка, а не как срыв;
          дозировки сервис не назначает.
        </p>
        <h2>Приватность</h2>
        <blockquote>Эти данные слишком личные, чтобы превращать их в рекламный профиль.</blockquote>
        <p>
          Личные заметки, Связки и Смыслы приватны по умолчанию. В общую базу что-либо попадает
          только после явного действия пользователя. Абсолютной безопасности не существует:
          технические поставщики инфраструктуры обрабатывают необходимые технические данные по своим
          правилам.
        </p>
        <div className="r-actions">
          <ShellButton className="primary" onClick={() => go('/')}>
            Вернуться в Habitoff
          </ShellButton>
        </div>
      </article>
    </main>
  );
}

function Profile({
  session,
  data,
  editSetup,
}: {
  session: Session;
  data: Bootstrap;
  editSetup: () => void;
}) {
  // Роль приезжает с профилем; ставит её не приложение, а миграция 20260817182500 по
  // закрытому allowlist. Прячется здесь только ссылка — доступ решает база:
  // admin_product_health отказывает не-администратору, и это проверено в
  // supabase/tests/local, а не оставлено на совесть интерфейса.
  const isAdmin = data.profile.role === 'admin';

  const [dataBusy, setDataBusy] = useState<'export' | 'delete' | null>(null);
  const [dataError, setDataError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function logout() {
    await getSupabase()?.auth.signOut();
    go('/');
  }

  // Выгрузка собирается в браузере и сохраняется файлом. Никакого промежуточного
  // сервиса: данные человека не должны проходить ещё через одно место только ради
  // кнопки «скачать».
  async function exportData() {
    setDataBusy('export');
    setDataError('');
    try {
      const payload = await exportMyData(session);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `habitoff-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      reportError(reason, { surface: 'profile-export', userId: data.profile.id });
      setDataError('Не удалось собрать выгрузку. Попробуй ещё раз.');
    } finally {
      setDataBusy(null);
    }
  }

  // Удаление необратимо, поэтому подтверждение отдельным шагом, а не `confirm()`:
  // системное окно человек закрывает не глядя, и как раз здесь этого допускать нельзя.
  async function deleteAccount() {
    setDataBusy('delete');
    setDataError('');
    try {
      await deleteMyAccount(session);
      await getSupabase()?.auth.signOut();
      go('/');
    } catch (reason) {
      reportError(reason, { surface: 'profile-delete', userId: data.profile.id });
      setDataError('Не удалось удалить аккаунт. Данные на месте, попробуй ещё раз.');
      setDataBusy(null);
    }
  }
  return (
    <main className="r-page">
      <section className="r-title">
        <p className="r-kicker">Профиль</p>
        <h1>{data.profile.display_name}</h1>
        <p>
          Здесь только настройки твоего эксперимента. Приватные Смыслы, Связки и заметки не
          превращаются в публичный профиль.
        </p>
      </section>
      {isAdmin && (
        <section className="r-section">
          <div className="r-section-head">
            <div>
              <p className="r-kicker">Служебное</p>
              <h2>Здоровье продукта</h2>
              <p>
                Агрегаты по всем участникам: сколько приходит, сколько остаётся, доходят ли до
                разбора эпизода. Ни одной записи о конкретном человеке.
              </p>
            </div>
            <ShellButton className="ghost small" onClick={() => go('/health')}>
              Открыть
            </ShellButton>
          </div>
          <div className="r-section-head">
            <div>
              <h2>Управление</h2>
              <p>
                Аналитика, доска работ и остальные служебные разделы под одним адресом. До этой
                строки в оболочку админки можно было попасть только вручную набрав адрес — то есть
                никак.
              </p>
            </div>
            <ShellButton className="ghost small" onClick={() => go('/admin')}>
              Открыть
            </ShellButton>
          </div>
        </section>
      )}
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Исходный уровень</p>
            <h2>С чем сравнивается динамика</h2>
          </div>
          <ShellButton className="ghost small" onClick={editSetup}>
            Изменить
          </ShellButton>
        </div>
        <div className="r-raw">
          {data.products.map((p: NicotineProduct) => (
            <div key={p.product_type}>
              <Icon name={productIcon(p.product_type)} />
              <small>{productLabel(p.product_type)}</small>
              <strong>
                {p.product_type === 'cigarette'
                  ? `${Number(p.baseline.cigarettes_per_day ?? 0)} / день`
                  : p.product_type === 'hookah'
                    ? `${Number(p.baseline.sessions_per_week ?? 0)} / нед.`
                    : `${Number(p.baseline.puffs_per_day ?? 0)} затяжек / день`}
              </strong>
            </div>
          ))}
        </div>
      </section>
      <section className="r-section">
        <div className="r-profile-links">
          <button onClick={() => go('/experiment')}>
            <Icon name="shield" />
            <span>
              <strong>Как работает эксперимент</strong>
              <small>Методология, ограничения и приватность</small>
            </span>
            <Icon name="arrow" />
          </button>
          <button onClick={() => go('/releases')}>
            <Icon name="path" />
            <span>
              <strong>История версий</strong>
              <small>Что меняется в Habitoff</small>
            </span>
            <Icon name="arrow" />
          </button>
        </div>
        <ShellButton className="danger" onClick={logout}>
          Выйти из аккаунта
        </ShellButton>
      </section>
      {/* Карточка несёт собственную рамку и заголовок; обёртка секции давала
          «Быстрый доступ» дважды подряд. Скрытием управляет сам компонент. */}
      <InstallPrompt always />
      <section className="r-section">
        <div className="r-section-head">
          <div>
            <p className="r-kicker">Твои данные</p>
            <h2>Забрать или удалить</h2>
            <p>
              Всё, что Habitoff знает о тебе, можно выгрузить одним файлом или удалить целиком. Это
              не одолжение и не поддержка по запросу — это твоё право, и оно работает без писем.
            </p>
          </div>
        </div>
        {dataError && <p className="r-data-error">{dataError}</p>}
        <div className="r-data-actions">
          <ShellButton className="ghost" onClick={exportData} disabled={dataBusy !== null}>
            {dataBusy === 'export' ? 'Собираю…' : 'Выгрузить всё в файл'}
          </ShellButton>
          {confirmDelete ? (
            <div className="r-confirm-delete">
              <p>
                <b>Удалить аккаунт?</b> Пропадут все эпизоды, Связки, Смыслы и заметки. Отменить
                будет нельзя, и восстановить будет неоткуда.
              </p>
              <div>
                <ShellButton
                  className="danger"
                  onClick={deleteAccount}
                  disabled={dataBusy !== null}
                >
                  {dataBusy === 'delete' ? 'Удаляю…' : 'Да, удалить навсегда'}
                </ShellButton>
                <ShellButton className="ghost" onClick={() => setConfirmDelete(false)}>
                  Отмена
                </ShellButton>
              </div>
            </div>
          ) : (
            <ShellButton
              className="danger"
              onClick={() => setConfirmDelete(true)}
              disabled={dataBusy !== null}
            >
              Удалить аккаунт
            </ShellButton>
          )}
        </div>
        <p className="r-footnote">
          Перед удалением имеет смысл выгрузить файл: после удаления данных не останется нигде — ни
          у тебя, ни на сервере.
        </p>
      </section>
    </main>
  );
}

function Releases() {
  return (
    <main className="r-reading">
      <Brand compact />
      <article>
        <p className="r-kicker">История версий</p>
        <h1>Habitoff развивается как эксперимент</h1>
        {RELEASES.map((release) => (
          <div className="r-release" key={release.version}>
            <b>{release.version}</b>
            <div>
              <h2>{release.title}</h2>
              <p>{release.summary}</p>
            </div>
          </div>
        ))}
        <BuildStamp />
        <div className="r-actions">
          <ShellButton className="primary" onClick={() => go('/')}>
            Назад в Habitoff
          </ShellButton>
        </div>
      </article>
    </main>
  );
}

/**
 * Из какого коммита собрана эта страница.
 *
 * Строка выглядит служебной, и она служебная. Она здесь потому, что расхождение между
 * репозиторием и живым продом до 27.08.2026 обнаруживалось только тем, что кто-то
 * однажды открывал сайт и читал заголовок. Теперь ответ на вопрос «а это вообще
 * свежая сборка» стоит одного взгляда — и на этой странице, и в `/version.json`,
 * который читает `scripts/check-deploy-drift.mjs`.
 */
function BuildStamp() {
  const { version, commit } = buildInfo;
  if (!version && !commit) return null;
  return (
    <p className="r-build-stamp">
      Эта страница собрана из версии {version || '—'}
      {commit && (
        <>
          , коммит <code>{commit.slice(0, 7)}</code>
        </>
      )}
      .
    </p>
  );
}

export default function RedesignApp() {
  const path = useLocation().pathname;
  const { configured, data, error, loading, reload, session } = useBootstrapSession();
  const publicCatalog = usePublicCatalog(session);
  const [setup, setSetup] = useState(false);
  const [flow, setFlow] = useState<{ open: boolean; trigger?: string }>({ open: false });
  // Ярлык на телефоне умеет длинное нажатие: «Хочу курить» открывает разбор сразу,
  // минуя главный экран. Манифест ведёт на /?flow=1, адрес чистится после открытия,
  // чтобы обновление страницы не открывало сценарий второй раз.
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('flow') !== '1') return;
    params.delete('flow');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
    setFlow({ open: true });
  }, [session]);
  const [quick, setQuick] = useState(false);
  const [evening, setEvening] = useState(false);
  if (!configured)
    return (
      <main className="r-login">
        <section className="r-login-card">
          <Brand />
          <h1>Не хватает настроек подключения</h1>
          <p>
            Интерфейс не получил адрес Supabase или публичный ключ. Секретные ключи сюда передавать
            нельзя.
          </p>
        </section>
      </main>
    );
  if (loading)
    return (
      <main className="r-loading">
        <span />
        <p>Загружаю Habitoff…</p>
      </main>
    );
  // Pre-login routing. The reading screens stand on their own without an account, and
  // everything else opens on PublicHome rather than a sign-in wall. LoginPage is kept
  // for the dedicated /login route: the flow still needs one screen that is only about
  // signing in, for anyone who arrives already intending to.
  if (path === '/experiment' && !session) return <Experiment />;
  if (path === '/releases' && !session) return <Releases />;
  if (path === '/login' && !session) return <LoginPage />;
  if (!session) return <PublicHome catalog={publicCatalog} path={path} />;
  if (!data && error)
    return (
      <main className="r-login">
        <section className="r-login-card">
          {/* Имя, стоящее отдельно, ставится знаком: в надзаголовке оно получило бы
              цвет надзаголовка целиком, и `off` перестал бы быть жёлтым. BRANDBOOK §3. */}
          <Brand />
          <h1>Личная карта не загрузилась</h1>
          <p>{error}</p>
          <ShellButton className="primary" onClick={() => window.location.reload()}>
            Перезагрузить
          </ShellButton>
        </section>
      </main>
    );
  if (!data)
    return (
      <main className="r-loading">
        <span />
        <p>Собираю личную карту…</p>
      </main>
    );
  if (!data.profile.onboarding_completed_at || !data.products.length)
    return (
      <Setup
        session={session}
        data={data}
        done={async () => {
          await reload(session);
        }}
      />
    );
  if (setup)
    return (
      <Setup
        session={session}
        data={data}
        done={async () => {
          await reload(session);
          setSetup(false);
        }}
        cancel={() => setSetup(false)}
      />
    );
  let page: ReactNode;
  if (path === '/links')
    page = (
      <Links
        session={session}
        data={data}
        reload={() => reload(session).then(() => {})}
        openFlow={(trigger) => setFlow({ open: true, trigger })}
      />
    );
  else if (path === '/path') page = <PathPage data={data} />;
  else if (path === '/meanings')
    page = <Meanings session={session} data={data} reload={() => reload(session).then(() => {})} />;
  else if (path === '/knowledge') page = <KnowledgePage data={data} />;
  else if (path === '/together') page = <TogetherPage data={data} />;
  else if (path === '/health') page = <HealthPage />;
  // Все разделы управления живут под одним адресом: /admin/<раздел>. Реестр разделов —
  // ADMIN_SECTIONS в redesign/admin.tsx, требования к блоку — docs/ADMIN.md.
  else if (path === '/admin' || path.startsWith('/admin/'))
    page = (
      <Suspense
        fallback={
          <main className="r-loading">
            <span />
            <p>Открываю управление…</p>
          </main>
        }
      >
        <AdminPage data={data} path={path} />
      </Suspense>
    );
  else if (path === '/experiment') page = <Experiment />;
  else if (path === '/profile')
    page = <Profile session={session} data={data} editSetup={() => setSetup(true)} />;
  else if (path === '/releases') page = <Releases />;
  else
    page = (
      <Today
        session={session}
        data={data}
        reload={() => reload(session).then(() => {})}
        openFlow={(trigger) => setFlow({ open: true, trigger })}
        openQuick={() => setQuick(true)}
        openEvening={() => setEvening(true)}
      />
    );
  const standalone = path === '/experiment' || path === '/releases';
  return (
    <>
      {!standalone && <Header data={data} path={path} />} {page}
      {flow.open && (
        <Guided
          session={session}
          data={data}
          close={() => setFlow({ open: false })}
          saved={() => reload(session).then(() => {})}
          initialTrigger={flow.trigger}
        />
      )}{' '}
      {quick && (
        <QuickUse
          session={session}
          data={data}
          close={() => setQuick(false)}
          saved={() => reload(session).then(() => {})}
        />
      )}{' '}
      {evening && (
        <Evening
          session={session}
          data={data}
          close={() => setEvening(false)}
          saved={() => reload(session).then(() => {})}
        />
      )}
    </>
  );
}
