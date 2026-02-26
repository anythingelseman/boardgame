/**
 * High-quality image that stays sharp during canvas zoom.
 *
 * Problem: objects live inside a CSS `scale(s)` world transform.
 * Images are rendered at their CSS container size (e.g. 80×120px),
 * then the world transform magnifies them as a blurry raster bitmap.
 *
 * Fix: render the image at `size × scale` CSS pixels, then apply
 * an inverse `scale(1/s)` so it fits the container. Net result: the
 * image bitmap is already at final display resolution before the world
 * scale runs, so it stays pixel-sharp at every zoom level.
 */
export default function HqImage({ src, alt, scale, className, style = {} }) {
    const s = Math.max(0.1, scale || 1);
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <img
                src={src}
                alt={alt || ''}
                draggable={false}
                decoding="async"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    // Render at `scale` × container size so pixels match final display size
                    width: `${100 * s}%`,
                    height: `${100 * s}%`,
                    maxWidth: 'none',
                    // Counter-scale to fit back inside the container
                    transform: `scale(${1 / s})`,
                    transformOrigin: '0 0',
                    objectFit: 'cover',
                    ...style,
                }}
                className={className}
            />
        </div>
    );
}
