import { Sun, Moon, KeyRound } from 'lucide-react';
import { Logo } from './Logo.jsx';
import { getApiKey } from '../lib/api.js';

export function Header({ theme, toggle, providers, onOpenKeys }) {
  const hasKey = !!getApiKey();
  return (
    <header className="header">
      <Logo />
      <div className="flex items-center gap-2.5">
        {providers?.length > 0 && (
          <span className="provider-dot"><span className="dot" /> {providers.join(' · ')}</span>
        )}
        {onOpenKeys && (
          <button className={`icon-btn${hasKey ? ' on' : ''}`} onClick={onOpenKeys} aria-label="Your API key" title={hasKey ? 'Your API key (active)' : 'Use your own API key'}>
            <KeyRound size={16} />
          </button>
        )}
        <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
