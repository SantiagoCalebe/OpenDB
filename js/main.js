import {createDatabaseClient} from './database/createDatabaseClient.js';
import {createDatabaseSession} from './database/createDatabaseSession.js';
import {createCommandHistory} from './commands/createCommandHistory.js';
import {createCommandExecutor} from './commands/executeCommand.js';
import {commandReference} from './commands/commandReference.js';
import {createTabNavigation} from './views/createTabNavigation.js';
import {createConsoleView} from './views/createConsoleView.js';
import {renderOverview} from './views/renderOverview.js';

const get = id => document.getElementById(id);
const commandField = get('command');
const fileInput = get('input');
const buttons = Array.from(document.querySelectorAll('[data-command]'));
const tabs = createTabNavigation(document, commandField);
const history = createCommandHistory();
const view = createConsoleView({
  screen:get('screen'), log:get('log'), intro:get('intro'), statusLine:get('status')
});
const session = createDatabaseSession(createDatabaseClient(), {
  onStatus:view.status,
  confirmDiscard:message => window.confirm(message),
  onChange(state) {
    const disabled = state.busy || !state.ready;
    for (const button of buttons) {
      button.disabled = disabled || (button.dataset.command === '.save' && !state.current);
    }
    get('run').disabled = disabled;
    commandField.readOnly = disabled;
    get('stop').hidden = !state.stoppable;
    renderOverview(get, state.current);
  }
});
const {execute,openFile} = createCommandExecutor({session,view,tabs,history,fileInput});

get('help-output').textContent = commandReference;
for (const button of buttons) button.onclick = () => execute(button.dataset.command);

function submit() {
  if (session.state.busy || !session.state.ready) return;
  const text = commandField.value;
  commandField.value = '';
  execute(text);
}

get('form').onsubmit = event => { event.preventDefault(); submit(); };
commandField.onkeydown = event => {
  if (event.isComposing) return;
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submit();
  } else if (['ArrowUp','ArrowDown'].includes(event.key) && !session.state.busy && !commandField.value.includes('\n')) {
    event.preventDefault();
    commandField.value = history.move(event.key === 'ArrowUp' ? -1 : 1, commandField.value);
    commandField.setSelectionRange(commandField.value.length, commandField.value.length);
  }
};

fileInput.onchange = event => {
  const file = event.target.files[0];
  fileInput.value = '';
  if (file) openFile(file);
};

get('stop').onclick = async () => {
  try {
    await session.stop();
  } catch (error) {
    view.show(view.entry('system'), 'Error: ' + error.message, 'error');
    view.status('Reload the page to restart SQLite.');
  }
};

document.onkeydown = event => {
  if (event.ctrlKey || event.metaKey) {
    if (session.state.busy || !session.state.ready) return;
    const key = event.key.toLowerCase();
    if (key === 'o') { event.preventDefault(); fileInput.click(); }
    if (key === 's' && session.state.current) { event.preventDefault(); execute('.save'); }
    if (key === 'l') { event.preventDefault(); execute('.clear'); }
    return;
  }
  if (event.defaultPrevented || event.altKey || event.isComposing ||
      event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (event.key === '/') { event.preventDefault(); tabs.focus('sql'); }
  if (event.key === '?') { event.preventDefault(); tabs.focus('help'); }
};

document.ondragover = event => {
  if (!Array.from(event.dataTransfer.types).includes('Files')) return;
  event.preventDefault();
  document.body.classList.add('drag');
};
document.ondragleave = event => {
  if (!event.relatedTarget) document.body.classList.remove('drag');
};
document.ondrop = event => {
  event.preventDefault();
  document.body.classList.remove('drag');
  const files = event.dataTransfer.files;
  if (files.length === 1) openFile(files[0]);
  else if (files.length > 1) {
    tabs.show('sql');
    view.show(view.entry('.open'), 'Drop one file at a time.', 'error');
  }
};

window.addEventListener('beforeunload', event => {
  if (!session.state.current?.dirty) return;
  event.preventDefault();
  event.returnValue = true;
});

try {
  await session.initialize();
  get('startup-note').hidden = true;
  view.status('Ready · type .help for commands');
} catch (error) {
  tabs.show('sql');
  view.show(view.entry('startup'), 'Error: ' + error.message, 'error');
  view.status('SQLite could not start.');
}
