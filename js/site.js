(function () {
  var LABEL = { evolucoes: 'Evoluções', atletas: 'Atletas' };
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  // Visualizador de foto ampliada
  var lb = document.createElement('dialog');
  lb.className = 'lightbox';
  lb.innerHTML = '<img alt=""><button type="button" class="btn o s" aria-label="Fechar foto">Fechar</button>';
  document.body.appendChild(lb);
  lb.addEventListener('click', function (e) { if (e.target !== lb.querySelector('img')) lb.close(); });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.shot');
    if (!b) return;
    var img = lb.querySelector('img');
    img.src = b.getAttribute('data-url');
    img.alt = b.querySelector('img').alt;
    lb.showModal();
  });

  function card(p) {
    return '<button type="button" class="shot" data-url="' + esc(p.url) + '"><img loading="lazy" decoding="async" src="' +
      esc(p.url) + '" alt="Foto de ' + LABEL[p.category] + '"></button>';
  }

  async function fill(box) {
    var cat = box.getAttribute('data-gallery');
    var limit = parseInt(box.getAttribute('data-limit') || '0', 10) || 0;
    if (!window.API.configured) {
      box.innerHTML = '<p class="msg">Configure o arquivo js/config.js para carregar as fotos.</p>';
      return;
    }
    box.setAttribute('aria-busy', 'true');
    try {
      var r = await window.API.listPhotos(cat, limit);
      box.innerHTML = r.items.length ? r.items.map(card).join('') : '<p class="msg">Em breve novas fotos por aqui.</p>';
      document.querySelectorAll('[data-count="' + cat + '"]').forEach(function (el) {
        el.textContent = r.total + (r.total === 1 ? ' foto' : ' fotos');
      });
    } catch (err) {
      box.innerHTML = '<p class="msg">Não foi possível carregar as fotos agora. Atualize a página em instantes.</p>';
    }
    box.removeAttribute('aria-busy');
  }

  // Pagina de galeria completa: /galeria.html?tipo=evolucoes|atletas
  var full = document.getElementById('full-gallery');
  if (full) {
    var tipo = new URLSearchParams(location.search).get('tipo');
    if (!LABEL[tipo]) tipo = 'evolucoes';
    full.setAttribute('data-gallery', tipo);
    document.getElementById('g-title').textContent = LABEL[tipo];
    document.title = LABEL[tipo] + ' — Tiago Cagide';
    document.querySelectorAll('[data-tipo]').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('data-tipo') === tipo);
    });
  }
  document.querySelectorAll('[data-gallery]').forEach(fill);
})();
