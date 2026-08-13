export default function LogoMark({ size = 24, activeCell = 3, className = '' }) {
    const cells = [0, 1, 2, 3];
    const gap = 3;
    const cellSize = (size - gap) / 2;
    const pad = 1; // room for stroke-width so it doesn't clip at the viewBox edge

    return (
        <svg
            className={`logo-mark ${className}`}
            width={size}
            height={size}
            viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
            aria-hidden="true"
        >
            {cells.map((i) => {
                const row = Math.floor(i / 2);
                const col = i % 2;
                return (
                    <rect
                        key={i}
                        className={i === activeCell ? 'cell cell-active' : 'cell'}
                        x={col * (cellSize + gap)}
                        y={row * (cellSize + gap)}
                        width={cellSize}
                        height={cellSize}
                        rx={cellSize * 0.06}
                    />
                );
            })}
        </svg>
    );
}
