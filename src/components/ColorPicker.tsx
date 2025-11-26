import React from 'react';

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
    return (
        <div className="color-picker-container">
            <label htmlFor="accent-color">Accent Color:</label>
            <input
                type="color"
                id="accent-color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
            />
            <span className="color-value">{color}</span>

            <style jsx>{`
        .color-picker-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
        }

        label {
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        input[type="color"] {
          border: none;
          width: 32px;
          height: 32px;
          cursor: pointer;
          background: none;
        }

        .color-value {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
      `}</style>
        </div>
    );
}
