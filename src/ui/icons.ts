// src/ui/icons.ts

/**
 * Создание иконки шестерёнки (Settings) с анимациями
 * @param size - размер в пикселях (по умолчанию 24)
 * @param color - цвет (по умолчанию currentColor)
 * @param className - дополнительные CSS-классы
 */
export function createSettingsIcon(
  size: number = 24,
  color: string = 'currentColor',
  className: string = ''
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', color);
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  
  // Добавляем базовый класс и пользовательский
  svg.classList.add('kmod-icon', 'kmod-icon-settings');
  if (className) svg.classList.add(className);

  // Пути для шестерёнки (стандартный набор из Feather/Lucide)
  const paths = [
    // Внешний круг с зубьями
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    // Внутренний круг (центр)
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'
  ];

  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }

  // Добавляем анимацию через CSS (будет применена глобально, но можно и инлайн)
  // Вставим стиль прямо в SVG (для автономности)
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .kmod-icon-settings {
      transition: transform 0.3s ease, stroke 0.3s ease;
      transform-origin: center;
    }
    .kmod-icon-settings:hover {
      transform: rotate(60deg) scale(1.1);
      stroke: #ffd700;
    }
    /* AFK-анимация (пульсация) — будет работать всегда, если не наведён */
    .kmod-icon-settings:not(:hover) {
      animation: kmod-icon-pulse 3s ease-in-out infinite;
    }
    @keyframes kmod-icon-pulse {
      0% { opacity: 0.85; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
      100% { opacity: 0.85; transform: scale(1); }
    }
  `;
  svg.appendChild(style);

  return svg;
}

/**
 * Создание иконки шеврона (стрелка вправо) с анимацией
 */
export function createChevronIcon(
  size: number = 24,
  color: string = 'currentColor',
  className: string = ''
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', color);
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  svg.classList.add('kmod-icon', 'kmod-icon-chevron');
  if (className) svg.classList.add(className);

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '9 18 15 12 9 6');
  svg.appendChild(polyline);

  // Стили с анимацией
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .kmod-icon-chevron {
      transition: transform 0.3s ease, stroke 0.3s ease;
    }
    .kmod-icon-chevron:hover {
      transform: translateX(4px);
      stroke: #ffd700;
    }
    .kmod-icon-chevron:not(:hover) {
      animation: kmod-icon-float 4s ease-in-out infinite;
    }
    @keyframes kmod-icon-float {
      0% { transform: translateX(0); }
      50% { transform: translateX(2px); }
      100% { transform: translateX(0); }
    }
  `;
  svg.appendChild(style);

  return svg;
}

/**
 * Создание иконки "Закрыть" (крестик) с анимацией вращения при наведении
 */
export function createCloseIcon(
  size: number = 24,
  color: string = 'currentColor',
  className: string = ''
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', color);
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  svg.classList.add('kmod-icon', 'kmod-icon-close');
  if (className) svg.classList.add(className);

  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line1.setAttribute('x1', '18');
  line1.setAttribute('y1', '6');
  line1.setAttribute('x2', '6');
  line1.setAttribute('y2', '18');

  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', '6');
  line2.setAttribute('y1', '6');
  line2.setAttribute('x2', '18');
  line2.setAttribute('y2', '18');

  svg.appendChild(line1);
  svg.appendChild(line2);

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .kmod-icon-close {
      transition: transform 0.3s ease;
    }
    .kmod-icon-close:hover {
      transform: rotate(90deg);
      stroke: #ff6b6b;
    }
    .kmod-icon-close:not(:hover) {
      animation: kmod-icon-pulse 4s ease-in-out infinite;
    }
  `;
  svg.appendChild(style);

  return svg;
}

/**
 * Создание иконки "Информация" (i) с анимацией
 */
export function createInfoIcon(
  size: number = 24,
  color: string = 'currentColor',
  className: string = ''
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', color);
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  svg.classList.add('kmod-icon', 'kmod-icon-info');
  if (className) svg.classList.add(className);

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '10');

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '12');
  line.setAttribute('y1', '16');
  line.setAttribute('x2', '12');
  line.setAttribute('y2', '12');

  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', '12');
  line2.setAttribute('y1', '8');
  line2.setAttribute('x2', '12.01');
  line2.setAttribute('y2', '8');

  svg.appendChild(circle);
  svg.appendChild(line);
  svg.appendChild(line2);

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .kmod-icon-info:hover {
      transform: scale(1.15);
      stroke: #4ade80;
    }
    .kmod-icon-info:not(:hover) {
      animation: kmod-icon-pulse 3s ease-in-out infinite;
    }
  `;
  svg.appendChild(style);

  return svg;
}

// Экспортируем все иконки единым объектом для удобства
export const icons = {
  settings: createSettingsIcon,
  chevron: createChevronIcon,
  close: createCloseIcon,
  info: createInfoIcon,
};