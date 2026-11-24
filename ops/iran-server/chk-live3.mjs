const h = await (await fetch('https://alavi.itpelc.ir/')).text();
console.log('pdfFull', h.includes('pdfFull'), 'p_cash', h.includes('id="p_cash"'), 'staffOwn', h.includes('staffOwn'), 'rfdCard', h.includes('rfdCard'), 'len', h.length);
