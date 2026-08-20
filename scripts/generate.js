/**
 * نشرة أدوات الذكاء الاصطناعي — مولّد الصفحة الثابتة
 * ------------------------------------------------
 * السكريبت ده بيشتغل عن طريق GitHub Actions (كل ٦ ساعات تقريبًا، شوف
 * .github/workflows/update.yml) وبيجهّز docs/index.html من جديد، وGitHub Pages
 * بيعرضها تلقائيًا. مفيش أي سيرفر لازم تديره، ومفيش أي تكلفة.
 *
 * ليه ده أحسن من Apps Script في نقطة الروابط تحديدًا؟ لأن الصفحة هنا بتتقدّم
 * مباشرة من GitHub (من غير إطار/iframe مقفول من جوجل)، فالروابط بتفتح عادي 100%.
 */

const fs = require("fs");
const path = require("path");

const CONFIG = {
  WINDOW_HOURS: 30, // نطاق أوسع شوية من Apps Script عشان الصفحة متفضلش فاضية بين تحديث وتاني
  MAX_PER_FEED: 5,
  MAX_PER_PERSON: 5,
  MAX_TOTAL: 55,
  TRANSLATE: true,
  TOOLS_ONLY: true,
  // رابط الـ Web App بتاع Apps Script (نفسه اللي بيبعت الإيميل اليومي) — ده بيستقبل
  // الاشتراكات عن طريق ?subscribe=email. غيّره لو عملت Deploy جديد ولينك الـ /exec اتغيّر.
  SUBSCRIBE_URL:
    "https://script.google.com/macros/s/AKfycbxFebEg1UA5qoIffVC93i1Sg4o-DfPIV7JK3yJ1NgRCmQVmDY6bXov9oJcDpqq5wa88/exec",
};

const TOOLS = [
  { group: "Claude / Anthropic", keys: ["claude", "anthropic"] },
  {
    group: "OpenAI / GPT",
    keys: [
      "openai",
      "chatgpt",
      "gpt-",
      "gpt4",
      "gpt5",
      "codex",
      "sora",
      "o3",
      "o4",
      "dall-e",
    ],
  },
  {
    group: "Google / Gemini",
    keys: ["gemini", "deepmind", "google ai", "notebooklm", "veo"],
  },
  {
    group: "أدوات البرمجة",
    keys: [
      "copilot",
      "cursor",
      "windsurf",
      "replit",
      "devin",
      "lovable",
      "bolt.new",
      "v0 by",
    ],
  },
  { group: "Meta / Llama", keys: ["llama", "meta ai"] },
  { group: "xAI / Grok", keys: ["grok", "xai"] },
  {
    group: "نماذج مفتوحة",
    keys: ["deepseek", "qwen", "mistral", "kimi", "hugging face", "falcon"],
  },
  {
    group: "أدوات إبداعية",
    keys: [
      "midjourney",
      "runway",
      "elevenlabs",
      "stable diffusion",
      "flux",
      "suno",
      "canva ai",
      "figma ai",
    ],
  },
  {
    group: "بحث ومساعدات",
    keys: ["perplexity", "notion ai", "manus", "comet browser"],
  },
];

const GENERIC_AI = [
  "artificial intelligence",
  " ai ",
  "ai tool",
  "llm",
  "language model",
  "agent",
];

const FEEDS = [
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
  },
  {
    name: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
  },
  {
    name: "MIT Tech Review",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
  },
  { name: "OpenAI", url: "https://openai.com/blog/rss.xml" },
  { name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/" },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml" },
  { name: "GitHub Blog", url: "https://github.blog/feed/" },
  { name: "Engadget AI", url: "https://www.engadget.com/rss.xml" },
  {
    name: "ZDNet AI",
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
  },
];

const PEOPLE = [
  // مؤسسين وقيادات
  { name: "Sam Altman (OpenAI)", handle: "sama" },
  { name: "Elon Musk (xAI)", handle: "elonmusk" },
  { name: "Demis Hassabis (DeepMind)", handle: "demishassabis" },
  { name: "Dario Amodei (Anthropic)", handle: "DarioAmodei" },
  { name: "Aravind Srinivas (Perplexity)", handle: "AravSrinivas" },
  { name: "Arthur Mensch (Mistral)", handle: "arthurmensch" },
  { name: "Clement Delangue (Hugging Face)", handle: "ClementDelangue" },
  { name: "Emad Mostaque", handle: "EMostaque" },
  { name: "Mustafa Suleyman (Microsoft AI)", handle: "mustafasuleyman" },
  { name: "Jensen Huang (NVIDIA)", handle: "jensenhuang" },
  { name: "Satya Nadella (Microsoft)", handle: "satyanadella" },
  { name: "Sundar Pichai (Google)", handle: "sundarpichai" },
  // باحثين ومهندسين معروفين
  { name: "Yann LeCun (Meta AI)", handle: "ylecun" },
  { name: "Andrej Karpathy", handle: "karpathy" },
  { name: "Ilya Sutskever", handle: "ilyasut" },
  { name: "Andrew Ng", handle: "AndrewYNg" },
  { name: "Yoshua Bengio", handle: "Yoshua_Bengio" },
  { name: "Fei-Fei Li", handle: "drfeifei" },
  { name: "Greg Brockman (OpenAI)", handle: "gdb" },
  { name: "Jack Clark (Anthropic)", handle: "jackclarkSF" },
  { name: "Lex Fridman", handle: "lexfridman" },
  // حسابات مؤسسات
  { name: "OpenAI", handle: "OpenAI" },
  { name: "Anthropic", handle: "AnthropicAI" },
  { name: "Google DeepMind", handle: "GoogleDeepMind" },
  { name: "xAI", handle: "xai" },
  { name: "Perplexity AI", handle: "perplexity_ai" },
  { name: "Hugging Face", handle: "huggingface" },
  { name: "Mistral AI", handle: "MistralAI" },
  // ضيف أي حساب هنا: { name: 'الاسم', handle: 'اسم_الحساب_من_غير_@' }
];

const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.poast.org",
  "https://nitter.privacyredirect.com",
  "https://xcancel.com",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchText(url, extraHeaders, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs || 15000);
  try {
    const res = await fetch(url, {
      headers: Object.assign({ "User-Agent": UA }, extraHeaders || {}),
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    clearTimeout(t);
    return null;
  }
}

function clean(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, "")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * محلّل RSS/Atom بسيط بدون أي مكتبة خارجية (Regex بس) — عشان السكريبت يفضل
 * مستقل بالكامل ومفيش أي احتمال إن تثبيت مكتبة يفشل في GitHub Actions.
 * مش محلل XML كامل، لكنه بيغطي بنية RSS 2.0 وAtom وRDF العادية اللي بتستخدمها
 * كل مصادر الأخبار هنا.
 */

function decodeEntities(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagContent(block, tag) {
  // بياخد أول <tag ...>...</tag> أو <tag ... /> جوه الـ block، وبيرجع النص جواه (أو attribute href لو موجود)
  const re = new RegExp(
    "<" + tag + "(\\s[^>]*)?(?:\\/>|>([\\s\\S]*?)<\\/" + tag + ">)",
    "i",
  );
  const m = block.match(re);
  if (!m) return null;
  return {
    attrs: m[1] || "",
    text: m[2] != null ? decodeEntities(m[2]).trim() : "",
  };
}

function attrValue(attrsStr, name) {
  if (!attrsStr) return null;
  const m = attrsStr.match(
    new RegExp(name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i"),
  );
  return m ? m[1] : null;
}

function extractBlocks(xmlText, tag) {
  const re = new RegExp(
    "<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">",
    "gi",
  );
  const out = [];
  let m;
  while ((m = re.exec(xmlText)) !== null) out.push(m[1]);
  return out;
}

function parseFeed(xmlText, sourceName, cutoff) {
  const out = [];
  if (!xmlText || typeof xmlText !== "string") return out;

  let entries = extractBlocks(xmlText, "item");
  let isAtom = false;
  if (!entries.length) {
    entries = extractBlocks(xmlText, "entry");
    isAtom = entries.length > 0;
  }
  if (!entries.length) return out;

  for (let i = 0; i < entries.length && out.length < CONFIG.MAX_PER_FEED; i++) {
    const e = entries[i];
    const titleNode = tagContent(e, "title");
    const title = titleNode ? titleNode.text : null;

    let link = null;
    if (isAtom) {
      // Atom: <link href="..." /> ممكن يتكرر، بناخد أول واحد له href
      const linkMatches = e.match(/<link[^>]*>/gi) || [];
      for (const lm of linkMatches) {
        const href = attrValue(lm, "href");
        if (href) {
          link = href;
          break;
        }
      }
    } else {
      const linkNode = tagContent(e, "link");
      link = linkNode
        ? linkNode.text || attrValue(linkNode.attrs, "href")
        : null;
    }

    const descNode =
      tagContent(e, isAtom ? "summary" : "description") ||
      tagContent(e, "content");
    const desc = descNode ? descNode.text : "";

    const dateNode =
      tagContent(e, isAtom ? "published" : "pubDate") ||
      tagContent(e, "updated") ||
      tagContent(e, "dc:date");
    const dateStr = dateNode ? dateNode.text : null;

    if (!title || !link) continue;
    const d = dateStr ? new Date(dateStr).getTime() : Date.now();
    if (isNaN(d) || d < cutoff) continue;

    out.push({
      title: clean(title),
      link: String(link).trim(),
      summary: clean(desc).slice(0, 240),
      source: sourceName,
      date: d,
    });
  }
  return out;
}

async function collectFeedItems(cutoff) {
  const all = [];
  let ok = 0,
    fail = 0;
  for (const feed of FEEDS) {
    const text = await fetchText(feed.url, {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    });
    if (!text) {
      fail++;
      console.log("فشل: " + feed.name);
      continue;
    }
    ok++;
    all.push(...parseFeed(text, feed.name, cutoff));
  }
  console.log(`مصادر الأخبار: نجح ${ok} / فشل ${fail}`);
  return all;
}

async function fetchPeopleTweets(cutoff) {
  const out = [];
  for (const person of PEOPLE) {
    let got = false;
    for (const instance of NITTER_INSTANCES) {
      if (got) break;
      const text = await fetchText(
        instance + "/" + person.handle + "/rss",
        {},
        10000,
      );
      if (!text) continue;
      const items = parseFeed(text, person.name, cutoff);
      if (items.length) {
        items.slice(0, CONFIG.MAX_PER_PERSON).forEach((it) => {
          it.isPerson = true;
          it.group = "تغريدات مؤثرين على X";
          out.push(it);
        });
      }
      got = true; // السيرفر رد (حتى لو من غير تغريدات جديدة) — منجربش سيرفر تاني
    }
    if (!got) console.log("تعذّر جلب تغريدات " + person.name);
  }
  return out;
}

function classify(items) {
  items.forEach((it) => {
    if (it.isPerson) return;
    const hay = (" " + it.title + " " + it.summary + " ").toLowerCase();
    it.group = null;
    for (const tool of TOOLS) {
      if (tool.keys.some((k) => hay.indexOf(k) !== -1)) {
        it.group = tool.group;
        break;
      }
    }
    if (!it.group && GENERIC_AI.some((k) => hay.indexOf(k) !== -1))
      it.group = "أخبار AI عامة";
  });
}

async function translate(text) {
  if (!text) return "";
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=" +
      encodeURIComponent(text);
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const data = await res.json();
      const out = data[0].map((seg) => seg[0] || "").join("");
      if (out.trim()) return out.trim();
    }
  } catch (e) {
    /* هنرجع النص الأصلي */
  }
  return text;
}

function groupItems(items) {
  const g = {};
  items.forEach((it) => {
    (g[it.group] = g[it.group] || []).push(it);
  });
  return g;
}

function ago(ms) {
  const h = Math.floor((Date.now() - ms) / 3600000);
  if (h < 1) return "الآن";
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

function render(items) {
  const bg = "#0F1216",
    card = "#171B21",
    ink = "#E8EBF0",
    mute = "#8B96A5",
    line = "#242A33",
    amber = "#FFB020";
  const F = "system-ui,'Segoe UI',Tahoma,sans-serif";
  const now = new Date();
  const today = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Cairo",
  });
  const updatedAt = now.toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
  });
  const groups = groupItems(items);
  const groupNames = Object.keys(groups);

  const chips = groupNames
    .map(
      (g) =>
        `<span style="display:inline-block;background:${card};border:1px solid ${line};border-radius:999px;padding:5px 12px;margin:0 0 6px 6px;font:600 12px/1 ${F};color:${ink};">${esc(g)} <span style="color:${amber};">${groups[g].length}</span></span>`,
    )
    .join("");

  const headlines = items
    .slice(0, 3)
    .map(
      (it) =>
        `<li style="margin-bottom:6px;">${esc(it.titleAr || it.title)}</li>`,
    )
    .join("");

  const summary = !items.length
    ? ""
    : `
    <tr><td style="padding:16px 18px;background:${card};border:1px solid ${line};border-radius:10px;">
      <div style="font:700 13px/1 ${F};color:${amber};margin-bottom:10px;">ملخص اليوم</div>
      <div style="margin-bottom:12px;">${chips}</div>
      <ul style="margin:0;padding:0 18px 0 0;font:400 13px/1.9 ${F};color:${mute};">${headlines}</ul>
    </td></tr><tr><td style="height:18px;"></td></tr>`;

  let body = groupNames
    .map((g) => {
      const head = `<tr><td style="padding:14px 0 10px 0;font:800 15px/1 ${F};color:${ink};"><span style="color:${amber};">▍</span> ${esc(g)}</td></tr>`;
      const rows = groups[g]
        .map(
          (it) => `
      <tr><td style="padding:0 0 12px 0;">
        <div style="background:${card};border:1px solid ${line};border-right:3px solid ${amber};border-radius:10px;padding:14px 16px;">
          <div style="font:600 11px/1.4 ${F};color:${amber};margin-bottom:7px;">${esc(it.source)} &nbsp;·&nbsp; <span style="color:${mute};font-weight:400;">${ago(it.date)}</span></div>
          <a href="${esc(it.link)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
            <div style="font:700 16px/1.6 ${F};color:${ink};margin-bottom:5px;">${esc(it.titleAr || it.title)}</div>
          </a>
          <div style="font:400 13px/1.9 ${F};color:${mute};">${esc(it.summaryAr || it.summary)}</div>
          <a href="${esc(it.link)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:9px;font:600 12px/1 ${F};color:${amber};text-decoration:none;">اقرأ الخبر ←</a>
        </div>
      </td></tr>`,
        )
        .join("");
      return head + rows;
    })
    .join("");

  if (!items.length) {
    body = `<tr><td style="padding:28px;text-align:center;color:${mute};font:400 15px ${F};">مفيش أخبار جديدة في آخر ${CONFIG.WINDOW_HOURS} ساعة (أو المصادر معطّلة مؤقتًا).</td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>نشرة أدوات الذكاء الاصطناعي</title>
<meta http-equiv="refresh" content="1800">
</head>
<body style="margin:0;background:${bg};">
<div dir="rtl" style="background:${bg};padding:26px 14px;margin:0;min-height:100vh;font-family:${F};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;">
    <tr><td style="padding-bottom:20px;border-bottom:1px solid ${line};">
      <div style="font:800 26px/1.4 ${F};color:${ink};">أدوات الذكاء الاصطناعي</div>
      <div style="font:400 13px/1.8 ${F};color:${mute};margin-top:4px;">
        ${today} &nbsp;·&nbsp; آخر تحديث ${updatedAt} بتوقيت القاهرة &nbsp;·&nbsp; ${items.length} خبر &nbsp;·&nbsp; ${groupNames.length} قسم
      </div>
    </td></tr>
    <tr><td style="height:16px;"></td></tr>
    <tr><td style="padding:14px 16px;background:${card};border:1px solid ${line};border-radius:10px;">
      <form id="subForm" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <span style="font:600 13px/1.6 ${F};color:${ink};white-space:nowrap;">📩 عايز النشرة توصلك يوميًا؟</span>
        <input id="subEmail" type="email" required placeholder="بريدك الإلكتروني" style="flex:1;min-width:160px;padding:9px 12px;border-radius:8px;border:1px solid ${line};background:${bg};color:${ink};font:400 13px ${F};" />
        <button type="submit" style="padding:9px 16px;border-radius:8px;border:none;background:${amber};color:#141414;font:700 13px ${F};cursor:pointer;">اشترك</button>
      </form>
      <form id="unsubForm" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;">
        <span style="font:400 12px/1.6 ${F};color:${mute};white-space:nowrap;">مشترك بالفعل وعايز تلغي الاشتراك؟</span>
        <input id="unsubEmail" type="email" required placeholder="بريدك الإلكتروني" style="flex:1;min-width:150px;padding:7px 10px;border-radius:8px;border:1px solid ${line};background:${bg};color:${ink};font:400 12px ${F};" />
        <button type="submit" style="padding:7px 14px;border-radius:8px;border:1px solid ${line};background:transparent;color:${mute};font:600 12px ${F};cursor:pointer;">إلغاء الاشتراك</button>
      </form>
      <div id="subMsg" style="display:none;margin-top:8px;font:600 12px/1.6 ${F};"></div>
    </td></tr>
    <tr><td style="height:18px;"></td></tr>
    ${summary}
    ${body}
    <tr><td style="padding-top:16px;border-top:1px solid ${line};font:400 12px/1.8 ${F};color:${mute};text-align:center;">
      نشرة تلقائية من ${FEEDS.length} مصدر أخبار + ${PEOPLE.length} حساب على X · بتتحدّث تلقائيًا كل شوية عن طريق GitHub Actions
    </td></tr>
  </table>
</div>
<script>
(function () {
  var SUB_URL = ${JSON.stringify(CONFIG.SUBSCRIBE_URL)};
  var msg = document.getElementById('subMsg');
  function showMsg(text, ok) {
    msg.textContent = text;
    msg.style.color = ok ? '${amber}' : '#E5484D';
    msg.style.display = 'block';
  }
  function send(param, email, successText) {
    var url = SUB_URL + '?' + param + '=' + encodeURIComponent(email);
    // no-cors: بنبعت الطلب من غير ما نقدر نقرا الرد (Apps Script مش بيسمح CORS)،
    // فبنعتبر إن الطلب اتبعت بنجاح لو مفيش خطأ شبكة — ومنفضلش في نفس الصفحة أصلاً
    // (منروحش لصفحة script.google.com فمفيش إشعار "Created by a Google Apps Script user").
    fetch(url, { method: 'GET', mode: 'no-cors' })
      .then(function () { showMsg(successText, true); })
      .catch(function () { showMsg('حصلت مشكلة في الاتصال، جرب تاني.', false); });
  }
  document.getElementById('subForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('subEmail').value.trim();
    if (!email) return;
    send('subscribe', email, '✅ تم الاشتراك بنجاح — هتوصلك النشرة كل يوم.');
  });
  document.getElementById('unsubForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('unsubEmail').value.trim();
    if (!email) return;
    send('unsubscribe', email, '✅ تم إلغاء الاشتراك.');
  });
})();
</script>
</body>
</html>`;
}

async function main() {
  const cutoff = Date.now() - CONFIG.WINDOW_HOURS * 3600 * 1000;

  const [feedItems, peopleItems] = await Promise.all([
    collectFeedItems(cutoff),
    fetchPeopleTweets(cutoff),
  ]);

  let all = feedItems.concat(peopleItems);
  classify(all);
  if (CONFIG.TOOLS_ONLY) all = all.filter((it) => it.isPerson || !!it.group);

  const seen = new Set();
  all = all.filter((it) => {
    const key = it.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 55);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  all.sort((a, b) => {
    const rank = (it) =>
      it.isPerson ? 0 : it.group === "أخبار AI عامة" ? 2 : 1;
    const ra = rank(a),
      rb = rank(b);
    if (ra !== rb) return ra - rb;
    return b.date - a.date;
  });
  all = all.slice(0, CONFIG.MAX_TOTAL);

  if (CONFIG.TRANSLATE) {
    for (const it of all) {
      it.titleAr = await translate(it.title);
      it.summaryAr = await translate(it.summary);
    }
  }

  const html = render(all);
  const outDir = path.join(__dirname, "..", "docs");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
  console.log(`تم إنشاء الصفحة: ${all.length} خبر في ${outDir}/index.html`);
}

main().catch((err) => {
  console.error("فشل التوليد:", err);
  process.exit(1);
});
