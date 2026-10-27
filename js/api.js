(function () {
  var BUCKET = 'galeria';
  var configured = !/COLE_AQUI/.test(window.CONFIG.SUPABASE_URL + window.CONFIG.SUPABASE_ANON_KEY);
  var sb = configured ? window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY) : null;

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

  window.API = { sb: sb, configured: configured, BUCKET: BUCKET, listPhotos: listPhotos };
})();
