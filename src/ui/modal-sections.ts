/** Navigation for existing reading sections. Never owns settings or game state. */
export function presentModalSections(body: HTMLElement): void {
  const sections = Array.from(body.children).filter((node): node is HTMLElement =>
    node instanceof HTMLElement && node.matches('.set-section'));
  if (sections.length < 2) return;
  presentReadingSections(body, sections.map(section => ({
    label: section.querySelector('.set-title')?.textContent ?? 'Settings', element: section,
  })), 'Settings sections');
}

/** Reparents existing content without replacing its event handlers or state. */
export function presentReadingSections(body: HTMLElement, sections: {label: string; element: HTMLElement}[], label: string): void {
  const layout = document.createElement('div'); layout.className = 'modal-sections';
  const nav = document.createElement('nav'); nav.className = 'modal-section-nav'; nav.setAttribute('aria-label', label);
  const pages = document.createElement('div'); pages.className = 'modal-section-pages';
  const buttons: HTMLButtonElement[] = [];
  sections.forEach(({element: section, label}, index) => {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-current', String(index === 0));
    section.hidden = index !== 0;
    button.onclick = () => {
      sections.forEach(({element: page}, i) => { page.hidden = i !== index; buttons[i]!.setAttribute('aria-current', String(i === index)); });
      pages.scrollTop = 0;
    };
    buttons.push(button); nav.append(button); pages.append(section);
  });
  layout.append(nav, pages); body.append(layout);
}
