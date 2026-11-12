import {renderResults} from './renderResults.js';

export function createConsoleView({screen,log,intro,statusLine}) {
  let lastResult = null;

  function scrollEnd() {
    requestAnimationFrame(() => { screen.scrollTop = screen.scrollHeight; });
  }

  function entry(text) {
    intro.hidden = true;
    const section = document.createElement('section');
    section.className = 'entry';
    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = 'opendb> ';
    const code = document.createElement('code');
    code.textContent = text;
    section.append(prompt,code);
    log.append(section);
    while (log.children.length > 30) log.firstElementChild.remove();
    scrollEnd();
    return section;
  }

  function show(section,text,type = '') {
    const output = document.createElement('pre');
    output.className = type;
    output.textContent = text;
    section.append(output);
    scrollEnd();
  }

  function result(section, payload, exportResult) {
    lastResult = exportResult;
    renderResults(section, payload, exportResult, show);
    scrollEnd();
  }

  function clear() {
    log.replaceChildren();
    intro.hidden = true;
  }

  return {
    entry, show, result, clear, scrollEnd,
    status:message => { statusLine.textContent = message; },
    resetResult:() => { lastResult = null; },
    exportLast:() => {
      if (!lastResult) return false;
      lastResult();
      return true;
    }
  };
}
