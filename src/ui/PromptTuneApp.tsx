import React from 'react';
import type { TabKey } from './tabTypes';

import { getApiBaseUrl } from '../shared/env';
import { fetchLimits, improvePrompt, savePromptToBackend } from '../shared/apiClient';
import {
  AuthInvalidError,
  ApiError,
  InvalidInstallationError,
  NetworkError,
  RateLimitExceededError,
  ValidationError,
} from '../shared/apiClient';
import { formatRateBadge, getRateBadgeState, type RateBadgeState } from '../shared/rateLimit';
import { getInstallationId } from '../shared/installation';
import { loadUiDraft, saveUiDraft } from '../shared/uiDraftStorage';
import {
  addPromptPairToLibrary,
  deletePromptPairFromLibrary,
  getPromptLibrary,
  getPromptLibraryMeta,
} from '../shared/promptLibraryStorage';
import { formatBytesKb } from '../shared/promptLibraryModel';
import { searchPromptPairs, type PromptPair } from '../shared/promptLibraryModel';
import { CLIENT_VERSION } from '../shared/apiContract';
import type { MessageFromUI, MessageToUI } from '../shared/messaging';

type UiVariant = 'popup' | 'sidepanel';

async function copyToClipboard(text: string): Promise<void> {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function friendlyErrorFromApi(err: unknown): string {
  if (err instanceof RateLimitExceededError) return 'Rate limit exceeded. Try again later.';
  if (err instanceof AuthInvalidError) return 'Your login is invalid (403).';
  if (err instanceof ValidationError) return err.message || 'Validation error from backend.';
  if (err instanceof InvalidInstallationError) return 'Invalid installation. Reload extension.';
  if (err instanceof NetworkError) return 'Network error. Check your connection.';
  if (err instanceof ApiError) return err.message || 'Request failed.';
  if (err instanceof Error) return err.message || 'Something went wrong.';
  return 'Something went wrong.';
}

function SkeletonLines({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pt-skeleton" />
      ))}
    </div>
  );
}

export function PromptTuneApp({ variant }: { variant: UiVariant }) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('improve');
  const [originalText, setOriginalText] = React.useState('');
  const [improvedText, setImprovedText] = React.useState('');
  const [isImproving, setIsImproving] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const [limitsLoading, setLimitsLoading] = React.useState(false);
  const [rateLimitState, setRateLimitState] = React.useState<RateBadgeState>('normal');
  const [rateBadgeText, setRateBadgeText] = React.useState('Loading...');

  const [installationId, setInstallationId] = React.useState<string | null>(null);

  const [libraryItems, setLibraryItems] = React.useState<PromptPair[]>([]);
  const [libraryLoading, setLibraryLoading] = React.useState(false);
  const [librarySearch, setLibrarySearch] = React.useState('');
  const [libraryMeta, setLibraryMeta] = React.useState<{ count: number; storageSizeKb: string } | null>(
    null,
  );

  function sendBackgroundMessage<T extends MessageFromUI>(msg: T): Promise<MessageToUI> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (res) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(err);
        resolve(res as MessageToUI);
      });
    });
  }

  async function switchToSidePanel() {
    const requestId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    await sendBackgroundMessage({
      type: 'SET_UI_MODE',
      requestId,
      payload: { mode: 'sidepanel' },
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) chrome.sidePanel.open({ tabId: tab.id });
  }

  async function switchToPopup() {
    const requestId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    await sendBackgroundMessage({
      type: 'SET_UI_MODE',
      requestId,
      payload: { mode: 'popup' },
    });
    // Opens the default popup for the current tab (only after the action popup is enabled in background).
    chrome.action.openPopup();
  }

  // Restore draft state (popup <-> sidepanel bonus expectation).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = await loadUiDraft();
      if (cancelled) return;
      if (draft) {
        setActiveTab(draft.activeTab);
        setOriginalText(draft.originalText);
        setImprovedText(draft.improvedText);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist draft state with debounce to avoid storage spam.
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      saveUiDraft({ activeTab, originalText, improvedText }).catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(t);
  }, [activeTab, originalText, improvedText]);

  // Load limits on open.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLimitsLoading(true);
      setErrorText(null);
      try {
        const id = await getInstallationId();
        if (cancelled) return;
        setInstallationId(id);
        const baseUrl = getApiBaseUrl();
        const limits = await fetchLimits(baseUrl, id);
        if (cancelled) return;
        setRateLimitState(getRateBadgeState(limits.per_day_remaining, limits.per_day_total));
        setRateBadgeText(formatRateBadge(limits.per_day_remaining, limits.per_day_total));
      } catch (err) {
        if (cancelled) return;
        const msg = friendlyErrorFromApi(err);
        setErrorText(msg);
        setRateLimitState('danger');
        setRateBadgeText('Rate limit');
      } finally {
        if (!cancelled) setLimitsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load library when user opens that tab (or on first open if draft sets it).
  React.useEffect(() => {
    if (activeTab !== 'library') return;
    let cancelled = false;
    (async () => {
      setLibraryLoading(true);
      try {
        const [items, meta] = await Promise.all([getPromptLibrary(), getPromptLibraryMeta()]);
        if (cancelled) return;
        setLibraryItems(items);
        setLibraryMeta({ count: meta.count, storageSizeKb: formatBytesKb(meta.approxStorageSizeBytes) });
      } catch {
        if (cancelled) return;
        setLibraryItems([]);
        setLibraryMeta({ count: 0, storageSizeKb: '0 B' });
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const filteredItems = React.useMemo(() => {
    return searchPromptPairs(libraryItems, librarySearch);
  }, [libraryItems, librarySearch]);

  async function handleImprove() {
    if (isImproving) return;
    const trimmed = originalText.trim();
    if (!trimmed) return;
    setErrorText(null);

    const id = installationId ?? (await getInstallationId());
    setInstallationId(id);

    const baseUrl = getApiBaseUrl();

    setIsImproving(true);
    setRateBadgeText('Improving...');
    try {
      const res = await improvePrompt(baseUrl, id, trimmed);
      setImprovedText(res.improved_text);
      setRateLimitState(getRateBadgeState(res.rate_limit.per_day_remaining, res.rate_limit.per_day_total));
      setRateBadgeText(formatRateBadge(res.rate_limit.per_day_remaining, res.rate_limit.per_day_total));
    } catch (err) {
      setRateLimitState('danger');
      setRateBadgeText('Rate limit');
      setErrorText(friendlyErrorFromApi(err));
    } finally {
      setIsImproving(false);
    }
  }

  async function handleCopyImproved() {
    await copyToClipboard(improvedText);
  }

  async function handleSaveToLibrary() {
    const original = originalText.trim();
    if (!original) return;
    if (!improvedText.trim()) return;
    setErrorText(null);

    const id = installationId ?? (await getInstallationId());
    setInstallationId(id);

    const baseUrl = getApiBaseUrl();

    setLibraryLoading(true);
    try {
      const backend = await savePromptToBackend(baseUrl, id, original, improvedText.trim());
      const next: PromptPair = {
        prompt_id: backend.prompt_id,
        original_text: original,
        improved_text: improvedText.trim(),
        created_at: Date.now(),
      };
      const updated = await addPromptPairToLibrary(next);
      setLibraryItems(updated);
      const meta = await getPromptLibraryMeta();
      setLibraryMeta({ count: meta.count, storageSizeKb: formatBytesKb(meta.approxStorageSizeBytes) });
      setActiveTab('library');
    } catch (err) {
      setErrorText(friendlyErrorFromApi(err));
    } finally {
      setLibraryLoading(false);
    }
  }

  async function handleCopyFromLibrary(item: PromptPair) {
    await copyToClipboard(item.improved_text);
    setImprovedText(item.improved_text);
    setActiveTab('improve');
  }

  async function handleDeleteFromLibrary(item: PromptPair) {
    setErrorText(null);
    try {
      const updated = await deletePromptPairFromLibrary(item.prompt_id);
      setLibraryItems(updated);
      const meta = await getPromptLibraryMeta();
      setLibraryMeta({ count: meta.count, storageSizeKb: formatBytesKb(meta.approxStorageSizeBytes) });
    } catch (err) {
      setErrorText(friendlyErrorFromApi(err));
    }
  }

  return (
    <div className="pt-app" data-variant={variant}>
      <div className="pt-panel">
        <div className="pt-header">
          <div className="pt-brand">
            <div className="pt-logo" />
            <div className="pt-title">PromptTune</div>
          </div>

          <div className="pt-headerRight">
            <div
              className={[
                'pt-badge',
                rateLimitState === 'warn' ? 'pt-badge--warn' : '',
                rateLimitState === 'danger' ? 'pt-badge--danger' : '',
              ].join(' ')}
              aria-label="Rate limit"
              title={limitsLoading ? 'Loading limits...' : `Backend client ${CLIENT_VERSION}`}
            >
              {rateBadgeText}
            </div>

            {variant === 'popup' ? (
              <button type="button" className="pt-switchBtn" onClick={() => void switchToSidePanel()}>
                Open sidebar
              </button>
            ) : (
              <button type="button" className="pt-switchBtn" onClick={() => void switchToPopup()}>
                Back to popup
              </button>
            )}
          </div>
        </div>

        <div className="pt-body">
          <div className="pt-tabs" role="tablist" aria-label="PromptTune tabs">
            <button
              type="button"
              className={['pt-tab', activeTab === 'improve' ? 'pt-tab--active' : ''].join(' ')}
              onClick={() => setActiveTab('improve')}
              role="tab"
              aria-selected={activeTab === 'improve'}
            >
              Improve
            </button>
            <button
              type="button"
              className={['pt-tab', activeTab === 'library' ? 'pt-tab--active' : ''].join(' ')}
              onClick={() => setActiveTab('library')}
              role="tab"
              aria-selected={activeTab === 'library'}
            >
              Library
            </button>
          </div>

          {activeTab === 'improve' ? (
            <div className="pt-grid">
              {errorText ? <div className="pt-errorBanner">{errorText}</div> : null}

              <div>
                <div className="pt-label">ORIGINAL PROMPT</div>
                <textarea
                  className="pt-textarea"
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="Type or paste your prompt here..."
                />
              </div>

              <button
                type="button"
                className={['pt-btn', 'pt-btn--primary'].join(' ')}
                onClick={() => void handleImprove()}
                disabled={isImproving || originalText.trim().length === 0}
              >
                {isImproving ? (
                  <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                    <span className="pt-spinner" />
                    Improving...
                  </span>
                ) : (
                  'Improve'
                )}
              </button>

              <div>
                <div className="pt-label">IMPROVED PROMPT</div>
                <textarea className="pt-textarea" readOnly value={improvedText} />
                {isImproving && !improvedText.trim() ? <SkeletonLines count={4} /> : null}
              </div>

              <div className="pt-actionsRow">
                <button
                  type="button"
                  className={['pt-btn', 'pt-btn--ghost'].join(' ')}
                  onClick={() => void handleCopyImproved()}
                  disabled={!improvedText.trim()}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className={['pt-btn', 'pt-btn--ghost'].join(' ')}
                  onClick={() => void handleSaveToLibrary()}
                  disabled={!improvedText.trim() || !originalText.trim() || libraryLoading}
                >
                  Save to Library
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-grid">
              {errorText ? <div className="pt-errorBanner">{errorText}</div> : null}

              <div>
                <div className="pt-label">SEARCH SAVED PROMPTS</div>
                <input
                  className="pt-input"
                  value={librarySearch}
                  placeholder="Search by original or improved..."
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 6 }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: 12 }}>
                  {libraryLoading ? 'Loading...' : `${libraryMeta?.count ?? 0} prompts`}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 800, fontSize: 12 }}>
                  {libraryMeta ? `~${libraryMeta.storageSizeKb}` : ''}
                </div>
              </div>

              {libraryLoading ? (
                <div style={{ paddingTop: 6 }}>
                  <SkeletonLines count={3} />
                </div>
              ) : filteredItems.length === 0 ? (
                <div style={{ padding: '12px 0', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                  No prompts found.
                </div>
              ) : (
                <div className="pt-list" role="list" aria-label="Prompt library">
                  {filteredItems.map((it) => (
                    <div key={it.prompt_id} className="pt-item" role="listitem">
                      <div className="pt-itemTop">
                        <div className="pt-itemTitle">{new Date(it.created_at).toLocaleDateString()}</div>
                        <div className="pt-itemBtns">
                          <button
                            type="button"
                            className="pt-iconBtn"
                            onClick={() => void handleCopyFromLibrary(it)}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            className="pt-iconBtn"
                            onClick={() => void handleDeleteFromLibrary(it)}
                            style={{
                              borderColor: 'rgba(255, 77, 77, 0.35)',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="pt-itemText">
                        <b style={{ color: 'rgba(255,255,255,0.86)' }}>Original:</b> {it.original_text}
                        {'\n'}
                        <b style={{ color: 'rgba(255,255,255,0.86)' }}>Improved:</b> {it.improved_text}
                      </div>
                      <div className="pt-metaRow">
                        <div title="Backend prompt id">id: {it.prompt_id.slice(0, 8)}...</div>
                        <div>v{CLIENT_VERSION}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-footer">
            <div>Rate us</div>
            <div className="pt-stars">
              {['★', '★', '★', '★', '★'].map((s, idx) => (
                <button key={idx} type="button" className="pt-starBtn" disabled>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

