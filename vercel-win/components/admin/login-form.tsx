'use client';

import { FormEvent, useState } from 'react';
import { ANALYTICS_OPT_OUT_KEY } from '../../lib/admin/analytics-client';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = await response.json() as { error?: string; ok?: boolean };
      if (!response.ok || !body.ok) throw new Error(body.error || '登入失敗');
      try { window.localStorage.setItem(ANALYTICS_OPT_OUT_KEY, '1'); } catch { /* still go to the dashboard */ }
      window.location.assign('/admin/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登入失敗');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-brand-mark">W</div>
        <p className="admin-eyebrow">WIN 講師班</p>
        <h1>流量與轉換後台</h1>
        <p className="admin-muted">輸入管理密碼後查看報名、付款與進站。</p>
        <label className="admin-field">
          <span>管理密碼</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="admin-alert error" role="alert">{error}</p> : null}
        <button className="admin-primary-button" type="submit" disabled={loading}>{loading ? '登入中' : '登入後台'}</button>
      </form>
    </main>
  );
}
