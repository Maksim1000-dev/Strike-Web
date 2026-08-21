// WebSocket-клиент мультиплеера. Авторизация — через cookie сессии.
export class NetworkClient {
  constructor() {
    this.ws = null;
    this.myId = null;
    this.connected = false;
    this.handlers = {};
  }

  on(type, fn) {
    (this.handlers[type] = this.handlers[type] || []).push(fn);
    return this;
  }

  _emit(type, data) {
    (this.handlers[type] || []).forEach((fn) => fn(data));
  }

  connect() {
    return new Promise((resolve) => {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      let ws;
      try {
        ws = new WebSocket(`${proto}//${location.host}/ws`);
      } catch {
        resolve(false);
        return;
      }
      this.ws = ws;

      const done = (ok) => {
        if (this._settled) return;
        this._settled = true;
        resolve(ok);
      };
      this._settled = false;

      ws.onopen = () => { this.connected = true; done(true); };
      ws.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        this._handle(m);
      };
      ws.onclose = () => {
        this.connected = false;
        this._emit('close', {});
      };
      ws.onerror = () => { done(false); };

      setTimeout(() => { if (!this.connected) done(false); }, 4000);
    });
  }

  _handle(m) {
    if (m.t === 'welcome') this.myId = m.id;
    this._emit(m.t, m);
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  }

  sendState(p, r, w) { this.send({ t: 'state', p, r, w }); }
  sendHit(id, dmg, w) { this.send({ t: 'hit', id, dmg, w }); }
  sendHurt(dmg) { this.send({ t: 'hurt', dmg }); }
  sendRespawn() { this.send({ t: 'respawn' }); }

  close() {
    if (this.ws) { try { this.ws.close(); } catch { /* ignore */ } this.ws = null; }
    this.connected = false;
  }
}
