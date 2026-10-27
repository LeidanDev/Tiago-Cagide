(function () {
  var BUCKET = 'galeria';
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

  window.API = { sb: sb, configured: configured && !!sb, initError: initError, BUCKET: BUCKET, listPhotos: listPhotos };
})();
