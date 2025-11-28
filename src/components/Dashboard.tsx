import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PRIMARY_COLOR } from '@/lib/theme';

const activityData = [
  { name: 'Mon', activity: 40 },
  { name: 'Tue', activity: 30 },
  { name: 'Wed', activity: 60 },
  { name: 'Thu', activity: 45 },
  { name: 'Fri', activity: 80 },
  { name: 'Sat', activity: 20 },
  { name: 'Sun', activity: 10 },
];

const usageData = [
  { name: 'GPT-4', usage: 2400 },
  { name: 'Claude', usage: 1398 },
  { name: 'Gemini', usage: 9800 },
];

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <div className="stats-row">
        <div className="stat-card">
          <h3>Total Chats</h3>
          <div className="stat-value">1,234</div>
          <div className="stat-change positive">+12% this week</div>
        </div>
        <div className="stat-card">
          <h3>Avg. Response</h3>
          <div className="stat-value">1.2s</div>
          <div className="stat-change positive">-0.3s this week</div>
        </div>
        <div className="stat-card">
          <h3>Tokens Used</h3>
          <div className="stat-value">450k</div>
          <div className="stat-change negative">+5% this week</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Weekly Activity</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0de" />
                <XAxis dataKey="name" stroke="#6e6d6b" fontSize={12} />
                <YAxis stroke="#6e6d6b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e0e0de', borderRadius: '8px' }}
                  itemStyle={{ color: '#2d2c2a' }}
                />
                <Line type="monotone" dataKey="activity" stroke={PRIMARY_COLOR} strokeWidth={2} dot={{ r: 4, fill: PRIMARY_COLOR }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Model Usage</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0de" />
                <XAxis dataKey="name" stroke="#6e6d6b" fontSize={12} />
                <YAxis stroke="#6e6d6b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e0e0de', borderRadius: '8px' }}
                  itemStyle={{ color: '#2d2c2a' }}
                  cursor={{ fill: '#f0f0ee' }}
                />
                <Bar dataKey="usage" fill={PRIMARY_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          width: 100%;
          max-width: 1000px;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-md);
        }

        .stat-card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .stat-card h3 {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stat-change {
          font-size: 0.75rem;
        }

        .stat-change.positive {
          color: #4caf50;
        }

        .stat-change.negative {
          color: #f44336;
        }

        .charts-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: var(--spacing-md);
        }

        .chart-card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          height: 300px;
          display: flex;
          flex-direction: column;
        }

        .chart-card h3 {
          font-size: 1rem;
          color: var(--text-primary);
          margin-bottom: var(--spacing-md);
          font-weight: 500;
        }

        .chart-wrapper {
          flex: 1;
          width: 100%;
          min-height: 0;
        }
      `}</style>
    </div>
  );
}
