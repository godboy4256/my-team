type RoomType = 'clubhouse' | 'meeting' | 'scouting' | 'office' | 'records';

type GameRoomFrameProps = {
  room: RoomType;
};

const roomLabels: Record<RoomType, string> = {
  clubhouse: 'CLUBHOUSE SCENE',
  meeting: 'MEETING ROOM SCENE',
  scouting: 'SCOUTING ROOM SCENE',
  office: 'FRONT OFFICE SCENE',
  records: 'CLUB ARCHIVE SCENE',
};

export function GameRoomFrame({ room }: GameRoomFrameProps) {
  return (
    <div className="game-room-frame" data-room={room} aria-hidden="true">
      <div className="game-room-wall" />
      <div className="game-room-window room-window-one" />
      <div className="game-room-window room-window-two" />
      <div className="game-room-board-mark" />
      <div className="game-room-floor" />
      <div className="game-room-light" />
      <div className="game-room-particles">
        {Array.from({ length: 8 }, (_, index) => (
          <i
            key={index}
            className={`room-particle room-particle-${index + 1}`}
          />
        ))}
      </div>
      <span className="game-room-art-label">{roomLabels[room]} · ART SLOT</span>
    </div>
  );
}
