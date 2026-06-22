// frontend/src/components/PremiumPanel.jsx
import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, Star, Shield, Sparkles, ChevronRight } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-1-nhlc.onrender.com');

const TIER_CONFIG = {
  free: { icon: '🆓', gradient: 'linear-gradient(135deg,#64748b,#475569)', btnClass: 'free-btn', label: 'Cyber Free' },
  pro: { icon: '💎', gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)', btnClass: 'pro-btn', label: 'Hacker Pro' },
  elite: { icon: '👑', gradient: 'linear-gradient(135deg,#a855f7,#bf00ff)', btnClass: 'elite-btn', label: 'Cyber Elite' }
};

export default function PremiumPanel({ user, showToast }) {
  const [plans, setPlans] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const token = localStorage.getItem('cc_token');

  const fetchPlans = async () => {
    try {
      const [plansRes, statusRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/premium/plans`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/premium/status`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const plansData = await plansRes.json();
      const statusData = await statusRes.json();
      if (plansData.success) setPlans(plansData.plans);
      if (statusData.success) setCurrentStatus(statusData);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleUpgrade = async (plan) => {
    if (upgrading) return;
    const isCurrent = currentStatus?.tier === plan.tier;
    if (isCurrent) return;

    setUpgrading(plan.planId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/premium/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ planId: plan.planId })
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`${plan.tier === 'free' ? '⬇️ Downgraded to' : '⬆️ Upgraded to'} ${data.tier}!`, 'success');
        fetchPlans();
      } else {
        showToast?.(data.error || 'Upgrade failed', 'error');
      }
    } catch { showToast?.('Network error', 'error'); }
    setUpgrading(null);
  };

  if (loading) {
    return (
      <div className="premium-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="notif-loading-pulse" />
      </div>
    );
  }

  const currentTier = currentStatus?.tier || 'free';
  const config = TIER_CONFIG[currentTier];

  return (
    <div className="premium-panel" id="premium-panel">
      {/* Header */}
      <div className="premium-header">
        <div className="premium-header-bg" />
        <div className="premium-crown">👑</div>
        <div className="premium-title">CyberChat Premium</div>
        <div className="premium-subtitle">Unlock the full power of the cyber realm</div>
        <div className="premium-current-badge" id="premium-current-badge">
          <span>{config?.icon}</span>
          Current Plan: {config?.label}
          {currentStatus?.expiresAt && (
            <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
              · Expires {new Date(currentStatus.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="premium-plans">
        {plans.map(plan => {
          const isCurrent = currentTier === plan.tier;
          const tierConfig = TIER_CONFIG[plan.tier] || {};

          return (
            <div
              key={plan.planId}
              className={`premium-plan-card ${plan.tier} ${isCurrent ? 'current' : ''}`}
              id={`premium-plan-${plan.planId}`}
            >
              {/* Badge */}
              {plan.tier === 'pro' && !isCurrent && <div className="premium-plan-badge popular">Most Popular</div>}
              {plan.tier === 'elite' && !isCurrent && <div className="premium-plan-badge best">Best Value</div>}
              {isCurrent && <div className="premium-plan-badge active">✓ Current Plan</div>}

              {/* Plan header */}
              <div className="premium-plan-icon">{tierConfig.icon || plan.badge}</div>
              <div className="premium-plan-name">{plan.name}</div>

              <div className="premium-plan-price">
                <span className="premium-plan-amount" style={{ 
                  background: tierConfig.gradient,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                </span>
                {plan.price > 0 && <span className="premium-plan-period">/month</span>}
              </div>

              <div className="premium-plan-desc">
                {plan.tier === 'free' && 'Perfect for getting started with CyberChat.'}
                {plan.tier === 'pro' && 'For power users who want the full experience.'}
                {plan.tier === 'elite' && 'For professionals & enterprises. No limits.'}
              </div>

              {/* Features */}
              <div className="premium-plan-features">
                {(plan.features || []).slice(0, 6).map((feature, i) => (
                  <div key={i} className="premium-feature-item">
                    <Check size={14} className="premium-feature-check" />
                    {feature}
                  </div>
                ))}
                {(plan.features || []).length > 6 && (
                  <div className="premium-feature-item" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    + {plan.features.length - 6} more features
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                className={`premium-upgrade-btn ${tierConfig.btnClass}`}
                id={`premium-upgrade-${plan.planId}`}
                onClick={() => handleUpgrade(plan)}
                disabled={isCurrent || upgrading === plan.planId}
              >
                {upgrading === plan.planId ? (
                  '⏳ Processing...'
                ) : isCurrent ? (
                  '✓ Current Plan'
                ) : plan.tier === 'free' ? (
                  '⬇️ Downgrade to Free'
                ) : (
                  <><Zap size={15} /> Upgrade to {plan.name}</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div style={{ padding: '0 20px 20px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center' }}>
        🔒 All payments are simulated for demonstration purposes. No real charges will be made.
        Premium features are fully functional in this build.
      </div>
    </div>
  );
}
