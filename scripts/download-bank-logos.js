#!/usr/bin/env node
/**
 * Descarga logos de bancos colombianos a assets/banks/
 * Uso: node scripts/download-bank-logos.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'banks');

const BANKS = [
  { id: 'bancolombia',  urls: ['https://logo.clearbit.com/bancolombia.com', 'https://www.bancolombia.com/favicon.ico'] },
  { id: 'davivienda',   urls: ['https://logo.clearbit.com/davivienda.com', 'https://www.davivienda.com/favicon.ico'] },
  { id: 'bbva',         urls: ['https://logo.clearbit.com/bbva.com', 'https://www.bbva.com.co/favicon.ico'] },
  { id: 'bogota',       urls: ['https://logo.clearbit.com/bancodebogota.com', 'https://www.bancodebogota.com/favicon.ico'] },
  { id: 'colpatria',    urls: ['https://logo.clearbit.com/scotiabankcolpatria.com', 'https://www.scotiabankcolpatria.com/favicon.ico'] },
  { id: 'itau',         urls: ['https://logo.clearbit.com/itau.co', 'https://www.itau.co/favicon.ico'] },
  { id: 'occidente',    urls: ['https://logo.clearbit.com/bancodeoccidente.com.co', 'https://www.bancodeoccidente.com.co/favicon.ico'] },
  { id: 'popular',      urls: ['https://logo.clearbit.com/bancopopular.com.co', 'https://www.bancopopular.com.co/favicon.ico'] },
  { id: 'avvillas',     urls: ['https://logo.clearbit.com/avvillas.com.co', 'https://www.avvillas.com.co/favicon.ico'] },
  { id: 'cajasocial',   urls: ['https://logo.clearbit.com/bancocajasocial.com.co', 'https://www.bancocajasocial.com.co/favicon.ico'] },
  { id: 'nequi',        urls: ['https://logo.clearbit.com/nequi.com.co', 'https://www.nequi.com.co/favicon.ico'] },
  { id: 'daviplata',    urls: ['https://logo.clearbit.com/daviplata.com', 'https://www.daviplata.com/favicon.ico'] },
  { id: 'nubank',       urls: ['https://logo.clearbit.com/nubank.com', 'https://nubank.com/favicon.ico'] },
  { id: 'lulo',         urls: ['https://logo.clearbit.com/lulobank.com.co', 'https://www.lulobank.com.co/favicon.ico'] },
  { id: 'rappipay',     urls: ['https://logo.clearbit.com/rappipay.com', 'https://rappipay.com/favicon.ico'] },
  { id: 'movii',        urls: ['https://logo.clearbit.com/movii.com.co', 'https://www.movii.com.co/favicon.ico'] },
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 100) { reject(new Error('File too small')); return; }
        fs.writeFileSync(destPath, buf);
        resolve(buf.length);
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function tryUrls(bank) {
  const destPath = path.join(OUT_DIR, `${bank.id}.png`);
  for (const url of bank.urls) {
    try {
      const size = await downloadFile(url, destPath);
      console.log(`  ✓ ${bank.id} — ${size} bytes (${url})`);
      return true;
    } catch (e) {
      console.log(`  ✗ ${bank.id} — ${url}: ${e.message}`);
    }
  }
  console.log(`  ⚠ ${bank.id} — no logo descargado, se usará fallback de iniciales`);
  return false;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Descargando logos a ${OUT_DIR}\n`);
  let ok = 0;
  for (const bank of BANKS) {
    if (await tryUrls(bank)) ok++;
  }
  console.log(`\nListo: ${ok}/${BANKS.length} logos descargados.`);
  if (ok < BANKS.length) {
    console.log('Los bancos sin logo usarán el fallback de iniciales automáticamente.');
  }
}

main().catch(console.error);
