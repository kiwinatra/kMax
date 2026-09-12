/*
* @author: potemk.in
* @brief: SVG icon factories — settings, chevron, close, info.
* @desc: Each icon is a pure SVGSVGElement factory. All shared styles and
*       keyframes live in a single injected <style> tag (id=kmod-icons-styles),
*       not duplicated inside every SVG. No per-icon animation loops.
*/

const STYLE_ID = 'kmod-icons-styles';
const NS = 'http://www.w3.org/2000/svg';

// ============================================================
// STYLES (injected once)
// ============================================================

const CSS = `
.kmod-icon {
    transition: transform 0.2s ease, stroke 0.2s ease;
    transform-origin: center;
    display: block;
}
.kmod-icon-settings:hover {
    transform: rotate(60deg) scale(1.08);
    stroke: #ffd700;
}
.kmod-icon-chevron:hover {
    transform: translateX(3px);
    stroke: #ffd700;
}
.kmod-icon-close:hover {
    transform: rotate(90deg);
    stroke: #ff6b6b;
}
.kmod-icon-info:hover {
    transform: scale(1.1);
    stroke: #4ade80;
}
`;

function ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
}

// ============================================================
// SVG HELPERS
// ============================================================

function svgRoot(size: number, color: string, className: string): SVGSVGElement {
    ensureStyles();
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', color);
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.classList.add('kmod-icon');
    if (className) svg.classList.add(className);
    return svg;
}

function svgPath(d: string): SVGPathElement {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    return path;
}

function svgLine(x1: string, y1: string, x2: string, y2: string): SVGLineElement {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    return line;
}

function svgCircle(cx: string, cy: string, r: string): SVGCircleElement {
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    return circle;
}

function svgPolyline(points: string): SVGPolylineElement {
    const poly = document.createElementNS(NS, 'polyline');
    poly.setAttribute('points', points);
    return poly;
}

// ============================================================
// ICONS
// ============================================================

export function createSettingsIcon(
    size: number = 24,
    color: string = 'currentColor',
    className: string = ''
): SVGSVGElement {
    const svg = svgRoot(size, color, className);
    svg.classList.add('kmod-icon-settings');

    svg.appendChild(
        svgPath(
            'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'
        )
    );
    svg.appendChild(svgCircle('12', '12', '4'));
    return svg;
}

export function createChevronIcon(
    size: number = 24,
    color: string = 'currentColor',
    className: string = ''
): SVGSVGElement {
    const svg = svgRoot(size, color, className);
    svg.classList.add('kmod-icon-chevron');
    svg.appendChild(svgPolyline('9 18 15 12 9 6'));
    return svg;
}

export function createCloseIcon(
    size: number = 24,
    color: string = 'currentColor',
    className: string = ''
): SVGSVGElement {
    const svg = svgRoot(size, color, className);
    svg.classList.add('kmod-icon-close');
    svg.appendChild(svgLine('18', '6', '6', '18'));
    svg.appendChild(svgLine('6', '6', '18', '18'));
    return svg;
}

export function createInfoIcon(
    size: number = 24,
    color: string = 'currentColor',
    className: string = ''
): SVGSVGElement {
    const svg = svgRoot(size, color, className);
    svg.classList.add('kmod-icon-info');
    svg.appendChild(svgCircle('12', '12', '10'));
    svg.appendChild(svgLine('12', '16', '12', '12'));
    svg.appendChild(svgLine('12', '8', '12.01', '8'));
    return svg;
}

export const icons = {
    settings: createSettingsIcon,
    chevron: createChevronIcon,
    close: createCloseIcon,
    info: createInfoIcon,
};

export default icons;