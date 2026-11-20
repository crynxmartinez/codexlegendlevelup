/** Keep unchanged children connected: focus, pointer capture and motion survive. */
export function syncChildren(parent: HTMLElement, children: readonly HTMLElement[]): void {
  const wanted = new Set(children);
  for (const old of Array.from(parent.children)) if (!wanted.has(old as HTMLElement)) old.remove();
  children.forEach((child, index) => {
    const current = parent.children[index] ?? null;
    if (current === child) return;
    // moveBefore preserves browser state when moving connected elements.
    const host = parent as HTMLElement & { moveBefore?: (node: Node, before: Node | null) => void };
    if (host.moveBefore && parent.isConnected && child.isConnected) host.moveBefore(child, current);
    else parent.insertBefore(child, current);
  });
}
