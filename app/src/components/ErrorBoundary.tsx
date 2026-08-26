import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../services/error-monitoring';

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
          <p className="r-kicker">Habitoff</p>
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
