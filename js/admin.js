(function () {
  var $ = function (s) { return document.querySelector(s); };
  var tab = 'evolucoes', pending = null, items = [], busy = false;

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function say(el, msg, bad) { el.textContent = msg; el.hidden = !msg; el.className = 'status' + (bad ? ' bad' : ''); }

  if (!window.API.configured) {
    $('#boot').hidden = true;
    $('#login').hidden = false;
    var why = {
      lib: 'Não foi possível carregar a biblioteca do Supabase. Verifique a conexão ou desative bloqueadores de anúncios.',
      url: 'A URL do Supabase em js/config.js está inválida. Ela deve ser parecida com https://abcdefgh.supabase.co, sem nada depois do .co.',
      config: 'Não foi possível iniciar o Supabase. Confira a URL e a chave em js/config.js.'
    }[window.API.initError] || 'Falta configurar o arquivo js/config.js (veja o README).';
    say($('#login-msg'), why, true);
    $('#login-form button').disabled = true;
    return;
  }
  var sb = window.API.sb;

  var pwdMode = null; // 'first' | 'change' | 'recovery'

  function view(n) {
    $('#boot').hidden = true;
    $('#login').hidden = n !== 'login';
    $('#panel').hidden = n !== 'panel';
    $('#pwd').hidden = n !== 'pwd';
  }

  function openPwd(mode) {
    pwdMode = mode;
    var first = mode === 'first', rec = mode === 'recovery';
    $('#pwd-h').textContent = first ? 'Crie sua nova senha' : rec ? 'Redefinir senha' : 'Alterar senha';
    $('#pwd-lead').textContent = first
      ? 'Este é o seu primeiro acesso. Troque a senha provisória por uma só sua para continuar.'
      : rec ? 'Defina uma nova senha para a sua conta.'
      : 'Informe a senha atual e escolha uma nova.';
    $('#cur-wrap').hidden = mode !== 'change';
    $('#pwd-cancel').textContent = mode === 'change' ? 'Cancelar' : 'Sair';
    ['#cur', '#np', '#np2'].forEach(function (s) { $(s).value = ''; });
    say($('#pwd-msg'), '');
    view('pwd');
  }

  function route(session, ev) {
    if (!session) { pwdMode = null; view('login'); return; }
    if (ev === 'PASSWORD_RECOVERY') { openPwd('recovery'); return; }
    if (pwdMode) return; // trocando a senha: nao sai da tela
    var meta = session.user.user_metadata || {};
    if (meta.password_changed !== true) { openPwd('first'); return; }
    if (!$('#panel').hidden) return; // ja no painel (evita recarregar ao voltar para a aba)
    view('panel');
    refresh();
  }

  async function refresh() {
    try {
      var r = await window.API.listPhotos(tab);
      items = r.items;
      say($('#list-msg'), '');
    } catch (e) { items = []; say($('#list-msg'), 'Não foi possível carregar as fotos. Tente novamente.', true); }
    render();
  }

  function render() {
    $('#count').textContent = items.length + (items.length === 1 ? ' foto' : ' fotos') + ' em ' + (tab === 'evolucoes' ? 'Evoluções' : 'Atletas');
    $('#grid').innerHTML = items.length ? items.map(function (p) {
      var c = pending === p.id;
      return '<div class="card"><div class="shot"><img loading="lazy" src="' + esc(p.url) + '" alt="Foto enviada em ' +
        new Date(p.created_at).toLocaleDateString('pt-BR') + '"></div><div class="cap"><span>' +
        new Date(p.created_at).toLocaleDateString('pt-BR') + '</span><button type="button" class="del' + (c ? ' c' : '') +
        '" data-del="' + p.id + '">' + (c ? 'Confirmar exclusão' : 'Excluir') + '</button></div></div>';
    }).join('') : '<p class="msg">Nenhuma foto ainda. Adicione a primeira acima.</p>';
  }

  function resize(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(u);
        var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('resize')); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('invalid')); };
      img.src = u;
    });
  }

  async function upload(files) {
    if (busy) return;
    busy = true;
    var ok = 0, fail = [], list = Array.prototype.slice.call(files);
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      say($('#up-msg'), 'Enviando ' + (i + 1) + ' de ' + list.length + '…');
      if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 15 * 1024 * 1024) { fail.push(f.name); continue; }
      var path = tab + '/' + crypto.randomUUID() + '.jpg';
      try {
        var blob = await resize(f);
        var up = await sb.storage.from(window.API.BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (up.error) throw up.error;
        var ins = await sb.from('photos').insert({ category: tab, path: path, caption: f.name.replace(/\.[^.]+$/, '') });
        if (ins.error) { await sb.storage.from(window.API.BUCKET).remove([path]); throw ins.error; }
        ok++;
      } catch (e) { fail.push(f.name); }
    }
    busy = false;
    var msg = ok + (ok === 1 ? ' foto adicionada.' : ' fotos adicionadas.');
    if (fail.length) msg += ' Não enviamos: ' + fail.join(', ') + ' (use JPG, PNG ou WebP).';
    say($('#up-msg'), msg, fail.length > 0);
    refresh();
  }

  async function remove(id) {
    var p = items.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var d = await sb.from('photos').delete().eq('id', id);
    if (d.error) { say($('#list-msg'), 'Não foi possível excluir. Tente novamente.', true); return; }
    await sb.storage.from(window.API.BUCKET).remove([p.path]);
    pending = null;
    say($('#list-msg'), 'Foto excluída.');
    refresh();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]');
    if (t) {
      tab = t.getAttribute('data-tab'); pending = null;
      document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b === t); });
      refresh(); return;
    }
    var d = e.target.closest('[data-del]');
    if (d) {
      var id = d.getAttribute('data-del');
      if (pending === id) remove(id); else { pending = id; render(); }
    }
  });

  $('#file').addEventListener('change', function (e) { upload(e.target.files); e.target.value = ''; });
  var dz = $('#drop');
  dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', function () { dz.classList.remove('over'); });
  dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('over'); upload(e.dataTransfer.files); });

  $('#login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = $('#em').value.trim(), pw = $('#pw').value;
    if (!email || !pw) { say($('#login-msg'), 'Preencha e-mail e senha para entrar.', true); return; }
    var btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; say($('#login-msg'), 'Entrando…');
    var r = await sb.auth.signInWithPassword({ email: email, password: pw });
    btn.disabled = false;
    if (r.error) { say($('#login-msg'), 'E-mail ou senha incorretos.', true); return; }
    $('#pw').value = ''; say($('#login-msg'), '');
  });

  $('#out').addEventListener('click', function () { sb.auth.signOut(); });

  $('#forgot').addEventListener('click', async function () {
    var email = $('#em').value.trim(), msg = $('#login-msg');
    if (!email) { say(msg, 'Digite seu e-mail acima para receber o link de redefinição.', true); return; }
    say(msg, 'Enviando…');
    await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    say(msg, 'Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Confira também a caixa de spam.');
  });

  $('#chpw').addEventListener('click', function () { openPwd('change'); });

  $('#pwd-cancel').addEventListener('click', function () {
    if (pwdMode === 'change') { pwdMode = null; view('panel'); }
    else sb.auth.signOut();
  });

  $('#pwd-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var np = $('#np').value, np2 = $('#np2').value, cur = $('#cur').value, msg = $('#pwd-msg');
    var btn = e.target.querySelector('button[type=submit]');
    if (pwdMode === 'change' && !cur) { say(msg, 'Informe a senha atual.', true); return; }
    if (np.length < 8 || !/[A-Za-z]/.test(np) || !/\d/.test(np)) { say(msg, 'A nova senha precisa ter ao menos 8 caracteres, com letras e números.', true); return; }
    if (np !== np2) { say(msg, 'As senhas não são iguais.', true); return; }
    if (pwdMode === 'change' && np === cur) { say(msg, 'A nova senha deve ser diferente da atual.', true); return; }
    btn.disabled = true; say(msg, 'Salvando…');
    try {
      if (pwdMode === 'change') {
        var u = (await sb.auth.getUser()).data.user;
        var chk = await sb.auth.signInWithPassword({ email: u.email, password: cur });
        if (chk.error) throw new Error('cur');
      }
      var r = await sb.auth.updateUser({ password: np, data: { password_changed: true } });
      if (r.error) throw r.error;
      pwdMode = null;
      view('panel');
      refresh().then(function () { say($('#list-msg'), 'Senha alterada com sucesso.'); });
    } catch (err) {
      var t = String(err && err.message || '');
      say(msg, t === 'cur' ? 'A senha atual está incorreta.'
        : /different/i.test(t) ? 'A nova senha deve ser diferente da anterior.'
        : 'Não foi possível salvar a nova senha. Tente novamente.', true);
    }
    btn.disabled = false;
  });

  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === 'INITIAL_SESSION' || ev === 'TOKEN_REFRESHED') return;
    setTimeout(function () { route(session, ev); }, 0);
  });
  sb.auth.getSession()
    .then(function (r) { route(r.data.session, 'INITIAL_SESSION'); })
    .catch(function () { view('login'); say($('#login-msg'), 'Não foi possível conectar ao Supabase. Confira js/config.js e a conexão.', true); });
})();