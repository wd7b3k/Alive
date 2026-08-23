import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';

let navigateRef: NavigateFunction | null = null;

export function registerNavigator(navigate: NavigateFunction) {
  navigateRef = navigate;
  return () => {
    if (navigateRef === navigate) navigateRef = null;
  };
}

export function navigateTo(to: To, options?: NavigateOptions) {
  if (navigateRef) {
    navigateRef(to, options);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  window.location.assign(typeof to === 'string' ? to : '/');
}
