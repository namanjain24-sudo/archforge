import { useEffect, useState } from 'react';
import { X, KeyRound, Check, ExternalLink, Trash2 } from 'lucide-react';
import { getApiKey, setApiKey, detectProvider } from '../lib/api.js';

const PROVIDERS = [
  { name: 'Groq', hint: 'gsk_…', url: 'https://console.groq.com/keys', note: 'Fast, free' },
  { name: 'Cerebras', hint: 'csk-…', url: 'https://cloud.cerebras.ai', note: 'Free, big daily limit' },
  { name: 'Gemini', hint: 'AIza… / AQ.…', url: 'https://aistudio.google.com/apikey', note: 'Free' },
  { name: 'Anthropic', hint: 'sk-ant-…', url: 'https://console.anthropic.com', note: 'Paid, highest accuracy' },
];

export function ApiKeyDialog({ open, onClose }) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (open) { setValue(getApiKey()); setSaved(false); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const provider = detectProvider(value);
  const trimmed = value.trim();
  const invalid = trimmed.length > 0 && !provider;

  const save = () => { setApiKey(trimmed); setSaved(true); setTimeout(onClose, 650); };
  const clear = () => { setApiKey(''); setValue(''); setSaved(false); };

  return (
    <div className="dlg-backdrop" onClick={onClose}>
      <div className="dlg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Your API key">
        <div className="dlg-head">
          <div className="dlg-title"><KeyRound size={17} /> Use your own API key</div>
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>

        <p className="dlg-sub">
          Runs entirely on your key — nothing shared. It stays in this browser only (localStorage),
          is sent straight to your provider and never stored on our server. Paste any one:
        </p>

        <div className="dlg-field">
          <input
            type="password" value={value} autoFocus spellCheck={false}
            placeholder="Paste your API key (gsk_… / csk-… / AIza… / sk-ant-…)"
            onChange={(e) => { setValue(e.target.value); setSaved(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && provider) save(); }}
          />
          {trimmed && (
            <span className={`dlg-badge${invalid ? ' bad' : ''}`}>
              {provider ? <><Check size={13} /> {provider} key</> : 'Unrecognized key'}
            </span>
          )}
        </div>

        <div className="dlg-providers">
          {PROVIDERS.map((p) => (
            <a key={p.name} className="dlg-prov" href={p.url} target="_blank" rel="noreferrer">
              <span className="dlg-prov-name">{p.name} <ExternalLink size={11} /></span>
              <span className="dlg-prov-hint mono">{p.hint}</span>
              <span className="dlg-prov-note">{p.note}</span>
            </a>
          ))}
        </div>

        <div className="dlg-actions">
          {getApiKey() && <button className="btn-ghost" onClick={clear}><Trash2 size={14} /> Remove</button>}
          <div style={{ flex: 1 }} />
          <button className="edit-toggle" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={!provider}>
            {saved ? <><Check size={15} /> Saved</> : 'Save key'}
          </button>
        </div>
      </div>
    </div>
  );
}
