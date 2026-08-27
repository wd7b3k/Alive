import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../services/error-monitoring';
import logoUrl from '../assets/brand-logo-full.svg';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(`${error.name}: ${error.message}\n${errorInfo.componentStack}`, {
      surface: 'boundary',
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="r-login">
        <section className="r-login-card">
          {/* Имя, стоящее отдельно, ставится знаком, а не текстом: набранное
              текстом, оно теряет двухцветность и зависит от наличия шрифта.
              BRANDBOOK §3. */}
          <img src={logoUrl} className="r-login-logo" alt="Habitoff" />
          <h1>Интерфейс столкнулся с ошибкой</h1>
          <p>Перезагрузи страницу, чтобы вернуться к работе.</p>
          <button className="r-button primary" onClick={() => window.location.reload()}>
            Перезагрузить
          </button>
        </section>
      </main>
    );
  }
}
