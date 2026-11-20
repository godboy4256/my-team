import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import clubGroundSand from '../../assets/club/club-ground-sand.png';

type ClubHomePageProps = {
  teamName: string;
  children?: ReactNode;
};

type PanStart = {
  pointerId: number;
  startX: number;
  scrollLeft: number;
};

export function ClubHomePage({ teamName, children }: ClubHomePageProps) {
  const panStart = useRef<PanStart | null>(null);

  function startPan(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    if (
      event.target instanceof Element &&
      event.target.closest('[data-facility]')
    ) {
      return;
    }

    panStart.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-panning');
    event.preventDefault();
  }

  function movePan(event: ReactPointerEvent<HTMLElement>) {
    if (!panStart.current || event.pointerId !== panStart.current.pointerId)
      return;
    event.currentTarget.scrollLeft =
      panStart.current.scrollLeft - (event.clientX - panStart.current.startX);
  }

  function endPan(event: ReactPointerEvent<HTMLElement>) {
    if (!panStart.current || event.pointerId !== panStart.current.pointerId)
      return;
    panStart.current = null;
    event.currentTarget.classList.remove('is-panning');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className="club-home-page" aria-label={`${teamName} 구단 홈`}>
      <section
        className="club-home-viewport"
        aria-label="구단 시설 배치 공간, 좌우로 이동할 수 있습니다"
        tabIndex={0}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className="club-home-world">
          <img
            className="club-home-background-image"
            src={clubGroundSand}
            alt=""
            aria-hidden="true"
          />
          <div className="club-home-buildings">{children}</div>
        </div>
      </section>
      <p className="club-home-welcome" role="status" aria-live="polite">
        {teamName || '우리 구단'}에 오신 걸 환영합니다
      </p>
    </section>
  );
}
