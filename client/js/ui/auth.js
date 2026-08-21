import { Auth, rememberUser, recallUser, forgetUser } from '../api.js';

// Экран входа/регистрации. Cookie — сессия; localStorage — «запомнить меня».
export class AuthScreen {
  constructor({ onAuth }) {
    this.onAuth = onAuth;
    this.root = document.getElementById('auth-screen');
    this.form = document.getElementById('auth-form');
    this.username = document.getElementById('auth-username');
    this.password = document.getElementById('auth-password');
    this.error = document.getElementById('auth-error');
    this.submit = document.getElementById('auth-submit');
    this.tabLogin = document.getElementById('tab-login');
    this.tabRegister = document.getElementById('tab-register');
    this.remember = document.getElementById('auth-remember');
    this.title = document.getElementById('auth-title');

    this.mode = 'login';
    this.busy = false;
    this._bind();

    this.username.value = recallUser();
    if (this.username.value) this.remember.checked = true;
  }

  _bind() {
    this.tabLogin.addEventListener('click', () => this.setMode('login'));
    this.tabRegister.addEventListener('click', () => this.setMode('register'));
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._submit();
    });
  }

  setMode(mode) {
    this.mode = mode;
    this.tabLogin.classList.toggle('active', mode === 'login');
    this.tabRegister.classList.toggle('active', mode === 'register');
    this.title.textContent = mode === 'login' ? 'ВХОД' : 'РЕГИСТРАЦИЯ';
    this.submit.textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
    this.error.textContent = '';
  }

  show() {
    this.root.classList.remove('hidden');
    setTimeout(() => this.username.focus(), 50);
  }

  hide() {
    this.root.classList.add('hidden');
  }

  async _submit() {
    if (this.busy) return;
    const username = this.username.value.trim();
    const password = this.password.value;
    if (!username || !password) {
      this.error.textContent = 'Заполни логин и пароль';
      return;
    }

    this.busy = true;
    this.submit.disabled = true;
    this.error.textContent = '';

    try {
      const fn = this.mode === 'login' ? Auth.login : Auth.register;
      const data = await fn(username, password);
      if (this.remember.checked) rememberUser(username);
      else forgetUser();
      this.password.value = '';
      this.onAuth(data.user);
    } catch (err) {
      this.error.textContent = err.message || 'Ошибка';
    } finally {
      this.busy = false;
      this.submit.disabled = false;
    }
  }
}
