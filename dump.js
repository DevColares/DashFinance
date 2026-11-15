const https = require('https');
https.get('https://docs.google.com/spreadsheets/d/1HXSVSwyey5_EhfmvFcDB9a7X9y1bcdaOgqLP2TDuNSQ/gviz/tq?tqx=out:json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const raw = d.substring(d.indexOf('{'), d.lastIndexOf('}') + 1);
    const p = JSON.parse(raw);
    p.table.rows.forEach((r, i) => {
      const rowVals = r.c ? r.c.map(c => c ? (c.f || c.v) : '').join(' | ') : '';
      console.log(i + ': ' + rowVals);
    });
  });
});
