import type { AppProps } from 'next/app';
import '@asyncapi/react-component/styles/default.min.css';
import '../styles/overrides.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
