export function createDatabaseClient() {
  let worker;
  let nextId = 0;
  const pending = new Map();

  function rejectPending(error) {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  }

  function start() {
    const source = new URL('./databaseWorker.js', import.meta.url);
    worker = new Worker(source, {type:'module'});
    worker.onmessage = ({data}) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      clearTimeout(request.timer);
      if (data.error) request.reject(Error(data.error));
      else request.resolve(data.result);
    };
    worker.onerror = event => {
      event.preventDefault();
      rejectPending(Error('The SQLite worker failed: ' + (event.message || 'could not load a module.')));
    };
  }

  function stop() {
    worker?.terminate();
    worker = null;
    const error = Error('Operation interrupted.');
    error.cancelled = true;
    rejectPending(error);
  }

  function request(op, data, onSlow) {
    return new Promise((resolve,reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        if (op === 'ready') {
          pending.delete(id);
          reject(Error('SQLite did not start. Reload the page using a local web server.'));
        } else {
          onSlow?.();
        }
      }, 20000);
      pending.set(id, {resolve,reject,timer});
      try {
        worker.postMessage({id,op,data}, data instanceof ArrayBuffer ? [data] : []);
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  }

  return {start,stop,request};
}
