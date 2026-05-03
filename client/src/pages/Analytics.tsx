import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { analyticsAPI } from '../api';

const COLORS = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b', '#f43f5e', '#ec4899', '#06b6d4', '#84cc16'];

export default function Analytics() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getSummary()
      .then((res) => setSummary(res.data))
      .catch((err) => console.error('Analytics error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 64px)',
      }}>
        <div className="animate-pulse-glow" style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--gradient-primary)',
        }} />
      </div>
    );
  }

  const hasData = summary && summary.totalSubmissions > 0;

  return (
    <div style={{ flex: 1, padding: '28px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
            📊 Learning <span className="text-gradient">Analytics</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Track your progress, identify weaknesses, and celebrate growth.
          </p>
        </div>

        {!hasData ? (
          <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.4 }}>📭</div>
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No data yet</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Submit your first code analysis to start tracking your learning journey.
            </p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
              <StatCard title="Total Submissions" value={summary.totalSubmissions} icon="📝" color="#6366f1" />
              <StatCard title="Error Types Found" value={summary.errorBreakdown?.length || 0} icon="🔍" color="#14b8a6" />
              <StatCard title="Hints Unlocked" value={summary.hintStats?.totalHints || 0} icon="🔓" color="#f59e0b" />
              <StatCard title="Solutions Revealed" value={summary.hintStats?.level3Unlocks || 0} icon="💡" color="#f43f5e" />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Error Breakdown */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 20 }}>Error Categories</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={summary.errorBreakdown?.slice(0, 6) || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                    <YAxis type="category" dataKey="category" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} width={140} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Language Distribution */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 20 }}>Language Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={summary.languageBreakdown || []}
                      dataKey="count"
                      nameKey="language"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={4}
                      label={({ language, percent }: any) =>
                        `${language} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {(summary.languageBreakdown || []).map((_: any, i: number) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Submissions Over Time */}
            {summary.submissionsOverTime?.length > 0 && (
              <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 20 }}>Submissions Over Time</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={summary.submissionsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Weakest Concepts */}
            {summary.weakestConcepts?.length > 0 && (
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>
                  🎯 Weakest Concepts — Focus Areas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {summary.weakestConcepts.map((c: any, i: number) => (
                    <div key={c.category} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      <span style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: `${COLORS[i]}20`,
                        color: COLORS[i],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{c.category}</div>
                        <div style={{
                          height: 6,
                          borderRadius: 3,
                          background: 'var(--color-bg-primary)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (c.count / summary.totalSubmissions) * 100)}%`,
                            background: COLORS[i],
                            borderRadius: 3,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                        {c.count} occurrences
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass-card"
      style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.3rem',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{title}</div>
      </div>
    </motion.div>
  );
}
