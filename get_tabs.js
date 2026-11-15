const https = require('https');
https.get('https://docs.google.com/spreadsheets/d/1HXSVSwyey5_EhfmvFcDB9a7X9y1bcdaOgqLP2TDuNSQ/htmlview', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const idx = d.indexOf('var items = [];');
    console.log(d.slice(idx, idx + 1200));
  });
});
