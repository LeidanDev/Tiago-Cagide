(function () {
  var BUCKET = 'galeria';
<<<<<<< HEAD
  var cfg = window.CONFIG || {};
  var url = String(cfg.SUPABASE_URL || '').trim();
  var key = String(cfg.SUPABASE_ANON_KEY || '').trim();
  var configured = !/COLE_AQUI/.test(url + key) && !!url && !!key;
  var sb = null, initError = '';

  if (configured) {
    if (!window.supabase) {
      initError = 'lib';
    } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
      initError = 'url';
    } else {
      try { sb = window.supabase.createClient(url.replace(/\/$/, ''), key); }
      catch (e) { initError = 'config'; }
    }
  }
=======
  var configured = !/COLE_AQUI/.test(window.CONFIG.SUPABASE_URL + window.CONFIG.SUPABASE_ANON_KEY);
  var sb = configured ? window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY) : null;
>>>>>>> 8f54dbe6649d2cd611ae4a7f340663abb13f5d4c

  function publicUrl(path) {
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function listPhotos(category, limit) {
    var q = sb.from('photos').select('*', { count: 'exact' })
      .eq('category', category).order('created_at', { ascending: false });
    if (limit) q = q.limit(limit);
    var r = await q;
    if (r.error) throw r.error;
    return {
      total: r.count || 0,
      items: r.data.map(function (p) { return Object.assign({}, p, { url: publicUrl(p.path) }); })
    };
  }

<<<<<<< HEAD
  window.API = { sb: sb, configured: configured && !!sb, initError: initError, BUCKET: BUCKET, listPhotos: listPhotos };
=======
  window.API = { sb: sb, configured: configured, BUCKET: BUCKET, listPhotos: listPhotos };
>>>>>>> 8f54dbe6649d2cd611ae4a7f340663abb13f5d4c
})();
