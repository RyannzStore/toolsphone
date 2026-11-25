// Pretty-printer / minifier XML sederhana (tanpa DOM) — validasi well-formed dilakukan di komponen via DOMParser.

export function formatXml(xml: string, indentUnit = '  '): string {
  const src = xml.trim();
  if (!src) return '';
  const tokens = src.match(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<\/?[^>]+>|[^<]+/g) ?? [];
  const lines: string[] = [];
  let depth = 0;
  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k];
    if (!tok.startsWith('<')) {
      const text = tok.replace(/\s+/g, ' ').trim();
      if (text) lines.push(indentUnit.repeat(depth) + text);
      continue;
    }
    if (tok.startsWith('</')) {
      depth = Math.max(depth - 1, 0);
      lines.push(indentUnit.repeat(depth) + tok);
      continue;
    }
    const selfClosing = tok.endsWith('/>') || tok.startsWith('<?') || tok.startsWith('<!');
    // inline: <tag>teks</tag> tetap satu baris
    if (!selfClosing) {
      const next = tokens[k + 1];
      const after = tokens[k + 2];
      if (next !== undefined && !next.startsWith('<') && after !== undefined && after.startsWith('</')) {
        const text = next.replace(/\s+/g, ' ').trim();
        lines.push(indentUnit.repeat(depth) + tok + text + after);
        k += 2;
        continue;
      }
    }
    lines.push(indentUnit.repeat(depth) + tok);
    if (!selfClosing) depth++;
  }
  return lines.join('\n');
}

export function minifyXml(xml: string): string {
  return xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}
