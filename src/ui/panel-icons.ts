/** Icon controls retain descriptive names for keyboard and screen-reader users. */
export function panelIcon(button: HTMLButtonElement, icon: 'expand' | 'compact' | 'minimize' | 'filter', label: string): void {
  const paths = {
    expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
    compact: 'M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5',
    minimize: 'M5 17h14',
    filter: 'M4 6h16M7 12h10m-6 6h2',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[icon]);
  svg.append(path); button.replaceChildren(svg); button.classList.add('panel-icon');
  button.setAttribute('aria-label', label); button.title = label;
}
