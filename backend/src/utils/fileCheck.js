// Looks inside an uploaded file, not just at its name.
// Images: must decode, sensible size, then are re-saved clean (strips hidden data and GPS/EXIF).
// PDFs: refused if they carry scripts, launch actions or embedded files.
// The image re-save needs the optional "sharp" package; without it only the PDF check and basic checks run.
const fs = require('fs');
let sharp = null;
try { sharp = require('sharp'); } catch (e) { sharp = null; }

const PDF_BAD = [/\/JavaScript/i, /\/JS\b/, /\/Launch/i, /\/OpenAction/i, /\/EmbeddedFile/i, /\/RichMedia/i];

async function inspectFile(file) {
  try {
    const mime = file.mimetype || '';
    if (mime === 'application/pdf') {
      const text = fs.readFileSync(file.path).toString('latin1');
      if (PDF_BAD.some(re => re.test(text))) return { ok: false, reason: 'This PDF contains active content and cannot be accepted.' };
      return { ok: true };
    }
    if (!sharp) return { ok: true, checked: false };
    const img = sharp(file.path, { failOn: 'error' });
    const meta = await img.metadata();
    if (!meta.width || !meta.height || meta.width < 100 || meta.height < 100) return { ok: false, reason: 'The image is too small to read.' };
    if (meta.width > 12000 || meta.height > 12000) return { ok: false, reason: 'The image is too large.' };
    const fmt = ['jpeg', 'png', 'webp'].includes(meta.format) ? meta.format : null;
    if (!fmt) return { ok: false, reason: 'Unsupported image type.' };
    const clean = await sharp(file.path).rotate().toFormat(fmt, fmt === 'jpeg' ? { quality: 90 } : {}).toBuffer();
    fs.writeFileSync(file.path, clean);
    file.size = clean.length;
    return { ok: true, checked: true };
  } catch (e) {
    return { ok: false, reason: 'This file could not be read as a valid image or PDF.' };
  }
}

// Returns the first problem found (and deletes all the files), or null when every file is fine
async function inspectFiles(files) {
  for (const f of files || []) {
    const r = await inspectFile(f);
    if (!r.ok) {
      (files || []).forEach(x => { try { fs.unlinkSync(x.path); } catch (e) { /* ignore */ } });
      return r.reason;
    }
  }
  return null;
}

module.exports = { inspectFile, inspectFiles };
