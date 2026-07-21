import { useEffect, useState } from 'react';
import { Landing } from './components/Landing.jsx';
import { ResultView } from './components/ResultView.jsx';
import { LoadingView } from './components/LoadingView.jsx';
import { Header } from './components/Header.jsx';
import { ApiKeyDialog } from './components/ApiKeyDialog.jsx';
import { useTheme } from './hooks/useTheme.js';
import { generate, fetchHealth } from './lib/api.js';
import sampleResult from './dev/sample-result.json';
import './App.css';

export default function App() {
  const { theme, toggle } = useTheme();
  const [providers, setProviders] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [keysOpen, setKeysOpen] = useState(false);

  useEffect(() => { fetchHealth().then((h) => setProviders(h.providers || [])); }, []);

  async function run(text) {
    const t = (text || '').trim();
    if (t.length < 3 || status === 'loading') return;
    setCurrentPrompt(t);
    setStatus('loading'); setError(''); setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const data = await generate(t);
      setResult(data);
      setStatus('done');
    } catch (e) {
      setError(e.message || 'Something went wrong.');
      setStatus('error');
    }
  }

  const keys = <ApiKeyDialog open={keysOpen} onClose={() => setKeysOpen(false)} />;
  const openKeys = () => setKeysOpen(true);

  const previewed = typeof window !== 'undefined' && window.location.hash === '#preview';
  if ((status === 'done' && result) || previewed) {
    return (
      <div className="app">
        <Header theme={theme} toggle={toggle} providers={providers} onOpenKeys={openKeys} />
        <ResultView result={previewed ? sampleResult : result} onNew={() => { setStatus('idle'); setResult(null); }} onRun={run} />
        {keys}
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="app">
        <Header theme={theme} toggle={toggle} providers={providers} onOpenKeys={openKeys} />
        <LoadingView prompt={currentPrompt} />
        {keys}
      </div>
    );
  }

  return (
    <div className="app">
      <Landing onRun={run} status={status} error={error} theme={theme} toggle={toggle} providers={providers} onOpenKeys={openKeys} />
      {keys}
    </div>
  );
}
