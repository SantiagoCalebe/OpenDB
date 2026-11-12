export function createTabNavigation(document, commandField) {
  const tabs = Array.from(document.querySelectorAll('[data-view]'));

  let activeView = 'main';

  function show(view) {
    activeView = view;
    for (const tab of tabs) {
      const active = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
  }

  function focus(view) {
    show(view);
    if (view === 'sql') commandField.focus();
    else tabs.find(tab => tab.dataset.view === view)?.focus();
  }

  for (const [index, tab] of tabs.entries()) {
    tab.onclick = () => show(tab.dataset.view);
    tab.onkeydown = event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      show(tabs[next].dataset.view);
      tabs[next].focus();
    };
  }

  for (const button of document.querySelectorAll('[data-open-view]')) {
    button.onclick = () => focus(button.dataset.openView);
  }

  return {show,focus,isActive:view => activeView === view};
}
