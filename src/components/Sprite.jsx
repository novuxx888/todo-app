import { useMemo } from 'react';

export default function Sprite({
  src,
  frameWidth,      // e.g., 32
  frameHeight,     // e.g., 32
  frameCount,      // total frames to play
  fps = 8,
  durationSecs,    // optional explicit duration
  scale = 2,       // must be integer for crisp pixel art
  loop = false,
  playing = true,
  horizontal = true, // frames advance left→right if true, else top→bottom

  // NEW: support sheets with spacing or grids
  frameGap = 0,      // pixels between frames (natural pixels in the PNG)
  columns = null,    // if the sheet is a grid, how many columns per row? (null = single row/column)
  startFrame = 0,    // start index if your animation begins later in the sheet

  alt = '',
  style = {},
  onEnd,
}) {
  const duration = useMemo(
    () => (durationSecs != null ? durationSecs : frameCount / Math.max(1, fps)),
    [durationSecs, frameCount, fps]
  );

  // effective stride = frame size + gap
  const strideX = frameWidth + (horizontal ? frameGap : 0);
  const strideY = frameHeight + (!horizontal ? frameGap : 0);

  // If grid, compute how far to travel to reach the last frame in the sequence.
  // We animate only one axis (x for horizontal, y for vertical) using steps(frameCount).
  const endX = useMemo(() => {
    if (!horizontal) return 0;
    // distance from frame 0 to the last frame in the row taking gaps into account
    return -(strideX * (frameCount - 1) * scale);
  }, [horizontal, strideX, frameCount, scale]);

  const endY = useMemo(() => {
    if (horizontal) return 0;
    return -(strideY * (frameCount - 1) * scale);
  }, [horizontal, strideY, frameCount, scale]);

  // Background size: we render only the visible frame size, but the image must be scaled consistently
  // Set background-size to the NATURAL sheet size scaled. If you know natural sheet width/height, you can pass them.
  // Without natural dimensions, we approximate using columns/rows + gaps.
  // For simple horizontal row: totalW = frameWidth*frameCount + frameGap*(frameCount-1)
  // For grid: totalW = frameWidth*cols + frameGap*(cols-1), totalH similarly.
  const cols = columns || (horizontal ? frameCount : 1);
  const rows = columns ? Math.ceil((startFrame + frameCount) / columns) : (horizontal ? 1 : frameCount);

  const totalW = (frameWidth * cols) + (frameGap * (cols - 1));
  const totalH = (frameHeight * rows) + (frameGap * (rows - 1));

  const baseStyle = {
    width: frameWidth * scale,
    height: frameHeight * scale,
    backgroundImage: `url(${src})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${totalW * scale}px ${totalH * scale}px`,
    backgroundPosition: '0px 0px',
    imageRendering: 'pixelated',
    '--sprite-end-x': `${endX}px`,
    '--sprite-end-y': `${endY}px`,
    '--sprite-duration': `${duration}s`,
    ...style,
  };

  const animStyle = playing
    ? {
        animation: `${horizontal ? 'sprite-steps-x' : 'sprite-steps-y'} var(--sprite-duration) steps(${frameCount}) ${loop ? 'infinite' : 'forwards'}`,
      }
    : {};

  return (
    <div
      role="img"
      aria-label={alt}
      style={{ ...baseStyle, ...animStyle }}
      onAnimationEnd={(e) => {
        if (e.currentTarget !== e.target) return;
        if (!loop && typeof onEnd === 'function') onEnd();
      }}
    />
  );
}
