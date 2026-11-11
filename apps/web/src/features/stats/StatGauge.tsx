import type { CSSProperties } from 'react';

const scoreSteps = [1, 2, 3, 4, 5] as const;

export function StatGauge({ score }: { score: number }) {
  return (
    <span className="stat-gauge" role="img" aria-label={`${score}점 / 5점`}>
      {scoreSteps.map((step) => (
        <span
          key={step}
          className={`stat-gauge-step stat-gauge-step-${step} ${step <= score ? 'is-filled' : ''}`}
          style={{ '--gauge-step': step } as CSSProperties}
        />
      ))}
    </span>
  );
}
