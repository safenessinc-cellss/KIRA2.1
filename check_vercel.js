import https from 'https';

https.get('https://kiracoach.vercel.app/', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const match = data.match(/<script type="module" crossorigin src="(\/assets\/[^"]+)"/);
    if (match) {
      const jsUrl = 'https://kiracoach.vercel.app' + match[1];
      console.log('Found JS URL:', jsUrl);
      https.get(jsUrl, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => data2 += chunk);
        res2.on('end', () => {
          console.log('JS File starts with:', data2.substring(0, 100));
        });
      });
    } else {
      console.log('No JS script tag found in HTML.');
      console.log(data.substring(0, 500));
    }
  });
});