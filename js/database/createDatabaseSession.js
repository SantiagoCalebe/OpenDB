export function createDatabaseSession(client, {onChange,onStatus,confirmDiscard}) {
  const state = {current:null, busy:false, stoppable:false, ready:false};
  let generation = 0;

  function interrupted() {
    const error = Error('Operation interrupted.');
    error.cancelled = true;
    return error;
  }

  function setBusy(busy, stoppable = false) {
    state.busy = busy;
    state.stoppable = stoppable;
    onChange(state);
  }

  async function operate(message, action, stoppable = false) {
    const id = ++generation;
    setBusy(true, stoppable);
    onStatus(message);
    const assertActive = () => {
      if (id !== generation) throw interrupted();
    };
    const request = async (op, data) => {
      assertActive();
      const result = await client.request(op, data, () => {
        if (id === generation) onStatus('Still running…');
      });
      assertActive();
      return result;
    };
    try {
      return await action(request);
    } finally {
      if (id === generation) setBusy(false);
    }
  }

  async function initialize() {
    await operate('Starting SQLite…', async request => {
      client.start();
      await request('ready');
      state.ready = true;
    });
  }

  function canReplace() {
    return !state.current?.dirty || confirmDiscard('Discard unsaved changes? Use .save to download the working copy first.');
  }

  async function open({origin,source,name}) {
    const session = await operate('Opening database…', async request => {
      const data = source ? await source.arrayBuffer() : undefined;
      const info = await request(origin, data);
      state.current = {...info,name,source,origin,dirty:false};
      return state.current;
    });
    return session;
  }

  async function close() {
    await operate('Closing database…', async request => {
      await request('close');
      state.current = null;
    });
  }

  async function query(sql) {
    return operate('Running SQL…', async request => {
      const result = await request('query', sql);
      state.current.dirty = result.dirty;
      if (result.tables) state.current.tables = result.tables;
      return result;
    }, true);
  }

  async function schema(filter) {
    return operate('Reading schema…', request => request('schema', filter), true);
  }

  async function save() {
    return operate('Preparing database copy…', async request => {
      const bytes = await request('save');
      state.current.savedBytes = bytes;
      state.current.dirty = false;
      return bytes;
    }, true);
  }

  async function stop() {
    if (!state.stoppable) return false;
    if (state.current?.dirty && !confirmDiscard('Stop and restore the last saved or opened copy? Unsaved changes will be lost.')) return false;

    // Invalidate the interrupted operation before replacing its worker.
    generation++;
    setBusy(true);
    onStatus('Restoring database…');
    const file = state.current;
    client.stop();
    try {
      client.start();
      await client.request('ready');
      if (file) {
        const reopened = file.savedBytes
          ? await client.request('open', file.savedBytes.slice().buffer)
          : await client.request(file.origin, file.source ? await file.source.arrayBuffer() : undefined);
        state.current = {...file,...reopened,textImport:file.textImport,dirty:false};
      }
      onStatus(file ? 'Session restored from the last saved or opened copy.' : 'Ready.');
    } catch (error) {
      state.current = null;
      state.ready = false;
      throw error;
    } finally {
      setBusy(false);
    }
    return true;
  }

  return {state,initialize,canReplace,open,close,query,schema,save,stop};
}
