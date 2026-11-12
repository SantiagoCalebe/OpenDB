export function createCommandHistory() {
  const commands = [];
  let position = 0;
  let draft = '';

  function remember(command) {
    commands.push(command);
    if (commands.length > 100) commands.shift();
    position = commands.length;
    draft = '';
  }

  function move(step, value) {
    if (position === commands.length) draft = value;
    position = Math.max(0, Math.min(commands.length, position + step));
    return commands[position] ?? draft;
  }

  return {remember,move,lines:() => commands.join('\n')};
}
