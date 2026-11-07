// Telegram accepts only a few HTML tags in messages. Anything else from the admin's editor is dropped,
// tags are kept properly nested, and stray < > & are escaped, so Telegram never rejects a post.
const MAP = { b: 'b', strong: 'b', i: 'i', em: 'i', u: 'u', ins: 'u', s: 's', strike: 's', del: 's', code: 'code', pre: 'pre', blockquote: 'blockquote', 'tg-spoiler': 'tg-spoiler', a: 'a' };

const escText = (t) => t.replace(/&(?!(?:amp|lt|gt|quot|#\d+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sanitizeTgHtml(html) {
  let out = '';
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g;
  let last = 0, m;
  while ((m = re.exec(html))) {
    out += escText(html.slice(last, m.index));
    last = re.lastIndex;
    const tag = MAP[m[2].toLowerCase()];
    if (!tag) continue;
    if (!m[1]) {
      if (tag === 'a') {
        const href = (m[3].match(/href\s*=\s*"([^"]*)"/i) || m[3].match(/href\s*=\s*'([^']*)'/i) || [])[1];
        if (!href || !/^(https?:\/\/|tg:\/\/)/i.test(href)) continue;
        out += `<a href="${href.replace(/"/g, '&quot;')}">`;
      } else out += `<${tag}>`;
      stack.push(tag);
    } else {
      const i = stack.lastIndexOf(tag);
      if (i < 0) continue;
      while (stack.length > i) out += `</${stack.pop()}>`;
    }
  }
  out += escText(html.slice(last));
  while (stack.length) out += `</${stack.pop()}>`;
  return out.trim();
}

// Length as Telegram counts it: the visible text, without tags.
export const tgTextLength = (html) => html.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#\d+);/g, 'x').length;
