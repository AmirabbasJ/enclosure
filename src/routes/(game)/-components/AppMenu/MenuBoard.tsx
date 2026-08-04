export function MenuBoard() {
  return (
    <div className="menu-board" aria-hidden>
      <svg viewBox="0 0 200 200" shapeRendering="crispEdges">
        <g fill="none" stroke="#3a4a8a" strokeWidth="2">
          <path d="M0 40 H200 M0 80 H200 M0 120 H200 M0 160 H200" />
          <path d="M40 0 V200 M80 0 V200 M120 0 V200 M160 0 V200" />
        </g>
        <rect
          x="0"
          y="0"
          width="200"
          height="200"
          fill="none"
          stroke="#5163a8"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}
