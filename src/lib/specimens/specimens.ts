/**
 * Specimen pages are complete, self-contained HTML documents. They are rendered
 * in a sandboxed frame and audited by the same engine used for submitted URLs
 * and pasted markup. Nothing in their reports is hand-written.
 */
export interface Specimen {
  id: string;
  name: string;
  domain: string;
  discipline: string;
  blurb: string;
  image?: string;
  html: string;
}

const ATELIER_IMAGE = "/specimens/atelier.jpg";
const FIELD_IMAGE = "/specimens/field.jpg";

const atelier = `<!doctype html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atelier Nord — Architecture and interiors, Oslo</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#e8e2d5;color:#211f18;font-family:Arial,Helvetica,sans-serif}
  a{color:inherit;text-decoration:none}
  .nav{display:flex;align-items:center;justify-content:space-between;padding:22px 52px;border-bottom:1px solid #c2bbaa}
  .brand{font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:-0.02em}
  .nav .links{display:flex;gap:26px;align-items:center;font-family:'Courier New',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase}
  .hero{display:grid;grid-template-columns:1.02fr .98fr;gap:48px;padding:44px 52px 30px}
  .eyebrow{font-family:'Courier New',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a69d8b;margin:0 0 26px}
  h1{font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:76px;line-height:.94;letter-spacing:-.035em;margin:0 0 30px}
  .lede{font-size:15px;line-height:1.6;max-width:360px;color:#514d41}
  .heroimg{width:100%;aspect-ratio:4/3.3;object-fit:cover;display:block}
  .caption{display:flex;justify-content:space-between;margin-top:10px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8e8777}
  .manifesto{padding:26px 52px;border-top:1px solid #c2bbaa}
  .manifesto p{font-family:'Times New Roman',Times,serif;font-size:22px;line-height:1.42;margin:0;color:#333027}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid #c2bbaa}
  .project{padding:22px 26px;border-right:1px solid #c2bbaa;min-height:160px;display:flex;flex-direction:column;justify-content:space-between}
  .project:nth-child(4){border-right:0}
  .project h3{font-family:Georgia,serif;font-weight:400;font-size:23px;margin:0 0 6px}
  .project p{font-family:'Courier New',monospace;font-size:11px;line-height:1.5;color:#7e786a;margin:0}
  .swatch{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px}
  .view{font-family:'Courier New',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:5px 0;display:inline-block}
  .band{display:flex;gap:12px;align-items:center;padding:18px 52px;border-top:1px solid #c2bbaa;background:#ded7c7}
  .tag{font-family:'Courier New',monospace;font-size:10px;padding:5px 8px;border:1px solid #b3ab99;color:#6c675a}
  .colorfield{display:flex;gap:4px;margin-left:auto}
  .colorfield i{display:block;width:16px;height:16px}
  .foot{padding:26px 52px;border-top:1px solid #c2bbaa;display:grid;grid-template-columns:1.4fr 1fr;gap:40px}
  .foot h3{font-family:Georgia,serif;font-size:22px;font-weight:400;margin:0 0 10px}
  .foot p{font-size:12px;line-height:1.6;color:#676255;margin:0;max-width:320px}
  form{display:flex;gap:8px;align-items:stretch}
  input{border:1px solid #b3ab99;background:transparent;padding:8px 10px;font-size:12px;flex:1;min-width:0;color:#211f18}
  button{border:1px solid #211f18;background:#211f18;color:#e8e2d5;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:6px 12px;cursor:pointer}
  .wide-index{width:1410px;padding:14px 52px;border-top:1px solid #c2bbaa;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#8e8777;white-space:nowrap}
</style>
</head>
<body>
  <div class="nav">
    <div class="brand">Atelier Nord</div>
    <div class="links">
      <a href="#work">Work</a>
      <a href="#studio">Studio</a>
      <a class="icon" href="#search"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#211f18" stroke-width="1.4"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg></a>
      <a href="#contact">Contact</a>
    </div>
  </div>

  <div class="hero">
    <div>
      <p class="eyebrow">Architecture &amp; interiors — Oslo</p>
      <h1>Rooms that hold the light.</h1>
      <p class="lede">We make quiet, durable places for living and working. Spaces that age well, sit lightly and give the people inside them room to breathe.</p>
    </div>
    <div>
      <img class="heroimg" src="${ATELIER_IMAGE}" loading="lazy">
      <div class="caption"><span>Fig. 01 — Nordlys House</span><span>59.91° N / 10.75° E</span></div>
    </div>
  </div>

  <div class="manifesto">
    <p>We begin with the site, the weather and the daily rituals a building has to hold. Then we reduce: better daylight, fewer materials, more generous thresholds, rooms that can change their mind without being rebuilt. Our practice is deliberately small, and our interest is in the long life of a place rather than the photograph of its first morning.</p>
  </div>

  <div class="grid" id="work">
    <div class="project"><h3>Nordlys House</h3><p><span class="swatch" style="background:#8a9178"></span>Residential · 2025</p><a class="view" href="#nordlys">View project →</a></div>
    <div class="project"><h3>Kvist Studio</h3><p><span class="swatch" style="background:#c4a484"></span>Workspace · 2024</p><a class="view" href="#kvist">View project →</a></div>
    <div class="project"><h3>Salt Rooms</h3><p><span class="swatch" style="background:#7e9aa6"></span>Hospitality · 2024</p><a class="view" href="#salt">View project →</a></div>
    <div class="project"><h3>Hage Pavilion</h3><p><span class="swatch" style="background:#b5a04f"></span>Cultural · 2023</p><a class="view" href="#hage">View project →</a></div>
  </div>

  <div class="band">
    <span class="tag">New stone / travertine</span>
    <span class="tag">Timber / untreated pine</span>
    <span class="tag">Domestic / 74 m²</span>
    <span class="tag">In progress</span>
    <div class="colorfield">
      <i style="background:#8a9178"></i><i style="background:#c4a484"></i><i style="background:#7e9aa6"></i><i style="background:#b5a04f"></i><i style="background:#9a7f6b"></i><i style="background:#6f7d83"></i><i style="background:#b9a58e"></i><i style="background:#8d6b5f"></i><i style="background:#5e6d5a"></i><i style="background:#c9b99e"></i><i style="background:#7a7166"></i><i style="background:#a5a894"></i><i style="background:#937c52"></i><i style="background:#b4c0b6"></i><i style="background:#9f8f7c"></i><i style="background:#6a7a6e"></i>
    </div>
  </div>

  <div class="wide-index">Selected works 2019—2026 &nbsp;·&nbsp; Oslo &nbsp;·&nbsp; Bergen &nbsp;·&nbsp; Reykjavík &nbsp;·&nbsp; Ålesund &nbsp;·&nbsp; Stockholm &nbsp;·&nbsp; Visby &nbsp;·&nbsp; Studio open by appointment</div>

  <div class="foot" id="contact">
    <div>
      <h3>A letter from the studio, four times a year.</h3>
      <p>Occasional notes on materials, process and the places we return to.</p>
    </div>
    <form>
      <input type="email" placeholder="Email address">
      <button type="submit">Join</button>
    </form>
  </div>
</body>
</html>`;

const fieldnotes = `<!doctype html>
<html lang="en">
<head>
<title>Field Notes — a journal of small observations, made slowly and kept close</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f4f1e6;color:#1c1e14;font-family:Arial,Helvetica,sans-serif}
  a{color:inherit;text-decoration:none}
  header{display:flex;justify-content:space-between;align-items:flex-end;padding:30px 44px 18px;border-bottom:1px solid #d5d0bd}
  .wordmark{font-family:Georgia,serif;font-size:34px;line-height:1;letter-spacing:-.03em}
  .wordmark em{font-style:italic;color:#556b00}
  header p{font-family:'Courier New',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#98957f;margin:0}
  nav{display:flex;gap:20px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
  .masthead{display:grid;grid-template-columns:1.15fr .85fr;border-bottom:1px solid #d5d0bd}
  .masthead-copy{padding:40px 44px 34px;display:flex;flex-direction:column;justify-content:space-between}
  .headline{font-family:Georgia,serif;font-size:76px;line-height:.94;letter-spacing:-.04em;margin:0}
  .headline em{color:#556b00}
  .dek{color:#555647;font-size:14px;line-height:1.6;max-width:300px;margin:28px 0 0}
  .kicker{font-family:'Courier New',monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#a09c86;margin:0 0 22px}
  .cover{width:100%;height:100%;min-height:380px;object-fit:cover;display:block}
  .body{display:grid;grid-template-columns:2fr 1fr;gap:0;border-bottom:1px solid #d5d0bd}
  .features{padding:30px 44px;border-right:1px solid #d5d0bd}
  .index-row{display:grid;grid-template-columns:38px 1fr auto;gap:20px;padding:20px 0;border-top:1px solid #d5d0bd;align-items:center}
  .index-row:last-child{border-bottom:1px solid #d5d0bd}
  .index-row span{font-family:'Courier New',monospace;font-size:10px;color:#98957f}
  .index-row h2{font-family:Georgia,serif;font-weight:400;font-size:25px;line-height:1.1;margin:0}
  .index-row h2 em{color:#556b00}
  .index-row p{font-size:12px;color:#696a58;margin:5px 0 0;line-height:1.5}
  .index-row .meta{font-family:'Courier New',monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#8b8874;text-align:right;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
  .round{width:22px;height:22px;border:1px solid #aaa690;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:10px}
  aside{padding:30px 32px;background:#eae6d6}
  aside h3{font-family:'Courier New',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 16px;color:#7d7a67}
  aside p{font-family:Georgia,serif;font-size:18px;line-height:1.45;margin:0 0 22px;color:#33362a}
  .note{padding:14px 0;border-top:1px solid #ccc6b1;display:flex;justify-content:space-between;font-size:11px;color:#5d5f4f}
  .note span{font-family:'Courier New',monospace;font-size:9px;color:#918d79}
  .tiny{font-family:'Courier New',monospace;font-size:9px;color:#a9a590;line-height:1.6;margin-top:20px}
  .marquee{width:1420px;padding:12px 44px;background:#dde88b;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;white-space:nowrap;color:#3d431d}
  .subscribe{display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:26px 44px;align-items:center}
  .subscribe h3{font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0}
  .subscribe h3 em{color:#556b00}
  .subscribe form{display:flex;border:1px solid #b8b39e;background:#faf8f0}
  .subscribe input{border:0;background:transparent;padding:12px;flex:1;min-width:0;font-size:12px}
  .subscribe button{border:0;background:#1c1e14;color:#f4f1e6;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:0 16px;height:33px;margin:3px}
  footer{padding:20px 44px;border-top:1px solid #d5d0bd;display:flex;justify-content:space-between;font-family:'Courier New',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8f8c78}
</style>
</head>
<body>
  <header>
    <div class="wordmark">Field <em>Notes</em></div>
    <p>Issue 14 / Spring 2026</p>
    <nav><a href="#essays">Essays</a><a href="#objects">Objects</a><a href="#archive">Archive</a><a href="#search"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#1c1e14" stroke-width="1.4"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg></a></nav>
  </header>

  <main>
    <section class="masthead">
      <div class="masthead-copy">
        <div>
          <p class="kicker">A journal of small observations</p>
          <div class="headline">The patient<br>life of <em>things.</em></div>
        </div>
        <p class="dek">Conversations with makers who measure their work in decades. This issue: clay, patience, and the quiet grammar of a well-made room.</p>
      </div>
      <div><img class="cover" src="${FIELD_IMAGE}" loading="lazy"></div>
    </section>

    <section class="body" id="essays">
      <div class="features">
        <div class="index-row">
          <span>01</span>
          <div><h2>The useful silence of <em>a studio</em></h2><p>On mornings, repetition and the objects that teach you how to hold them.</p></div>
          <div class="meta"><span>Essay · 12 min</span><a class="round" href="#essay-01" target="_blank">↗</a></div>
        </div>
        <div class="index-row">
          <span>02</span>
          <div><h2>What the kiln remembers</h2><p>A conversation about failure, glaze and the second life of a broken bowl.</p></div>
          <div class="meta"><span>Interview · 8 min</span><a class="round" href="#essay-02" target="_blank">↗</a></div>
        </div>
        <div class="index-row">
          <span>03</span>
          <div><h2>Notes on a narrow shelf</h2><p>Domestic architecture and the small distances that make a room feel alive.</p></div>
          <div class="meta"><span>Field notes · 5 min</span><a class="round" href="#essay-03" target="_blank">↗</a></div>
        </div>
        <div class="index-row">
          <span>04</span>
          <div><h2>The weight of <em>unfinished</em> work</h2><p>Against polish: why some objects are better left with evidence of a hand.</p></div>
          <div class="meta"><span>Essay · 9 min</span><a class="round" href="#essay-04" target="_blank">↗</a></div>
        </div>
      </div>
      <aside id="objects">
        <h3>From the editor</h3>
        <p>We keep returning to the same thought this season: that attention is a material, and it has a grain.</p>
        <div class="note"><span>01 / Editors letter</span><span>Read →</span></div>
        <div class="note"><span>02 / Objects we kept</span><span>View →</span></div>
        <div class="note"><span>03 / Letters to us</span><span>Open →</span></div>
        <p class="tiny">Set in Georgia and Courier. Printed in two colours on recycled stock. Published three times a year from a small room in Copenhagen.</p>
      </aside>
    </section>

    <div class="marquee">FIELD NOTES 14 · CLAY / LIGHT / PATIENCE · OUT NOW · FIELD NOTES 14 · CLAY / LIGHT / PATIENCE · OUT NOW ·</div>

    <section class="subscribe" id="archive">
      <h3>The next issue, <em>quietly</em> delivered.</h3>
      <form>
        <input type="email" placeholder="you@address.com">
        <button type="submit">Subscribe</button>
      </form>
    </section>
  </main>

  <footer><span>Field Notes Journal</span><span>Copenhagen / 2026</span><span><a href="#privacy">Privacy</a> · <a href="#terms">Terms</a></span></footer>
</body>
</html>`;

const monogram = `<!doctype html>
<html lang="en">
<head>
<title>Monogram — Graphic systems for ambitious cultural institutions</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Monogram is an independent graphic design practice building identities and editorial systems for museums, publishers and cultural organisations.">
<meta property="og:title" content="Monogram — Graphic systems for culture">
<meta property="og:image" content="/og-image.png">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#151613;color:#eeebdf;font-family:Georgia,'Times New Roman',serif}
  a{color:inherit;text-decoration:none}
  header{display:flex;justify-content:space-between;align-items:center;padding:24px 46px;border-bottom:1px solid #3b3c33}
  .logo{display:flex;align-items:center;gap:10px;font-size:22px;letter-spacing:-.02em}
  .logo i{display:block;width:14px;height:14px;background:#cbf25f}
  nav{display:flex;gap:24px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#a9a798}
  .hero{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:60px 46px 40px;align-items:end}
  h1{font-size:72px;line-height:.95;font-weight:400;letter-spacing:-.04em;margin:0}
  h1 em{color:#cbf25f}
  .side p{font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;color:#a9a798;margin:0 0 18px;max-width:340px}
  .side a{display:inline-block;border-bottom:1px solid #cbf25f;padding-bottom:3px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#cbf25f}
  .strip{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #3b3c33;border-bottom:1px solid #3b3c33;margin-top:20px}
  .client{padding:22px 46px;border-right:1px solid #3b3c33}
  .client:last-child{border-right:0}
  .client h3{font-family:'Courier New',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#87867a;font-weight:400;margin:0 0 8px}
  .client p{font-size:20px;margin:0}
  .contact{display:flex;justify-content:space-between;align-items:center;padding:28px 46px}
  .contact p{font-family:'Courier New',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#87867a;margin:0}
  .contact a{background:#cbf25f;color:#151613;padding:10px 14px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
</style>
</head>
<body>
  <header><div class="logo"><i></i>Monogram</div><nav><a href="#work">Work</a><a href="#studio">Studio</a><a href="#contact">Contact</a></nav></header>
  <section class="hero">
    <h1>Graphic systems for <em>culture.</em></h1>
    <div class="side"><p>An independent design practice building identities, publications and digital systems for museums, publishers and the people who keep them thinking.</p><a href="#work">See selected work →</a></div>
  </section>
  <section class="strip"><div class="client"><h3>Client / 2025</h3><p>Kunsthal Bergen</p></div><div class="client"><h3>Client / 2025</h3><p>Nordic Review</p></div><div class="client"><h3>Client / 2024</h3><p>Museum of Quiet</p></div></section>
  <div class="contact"><p>Commissions open for autumn 2026</p><a href="mailto:studio@monogram.example">Write to us</a></div>
</body>
</html>`;

export const SPECIMENS: Specimen[] = [
  {
    id: "atelier",
    name: "Atelier Nord",
    domain: "ateliernord.studio",
    discipline: "Architecture",
    blurb: "An editorial architecture studio page with a considered layout and a stack of quiet accessibility failures.",
    image: ATELIER_IMAGE,
    html: atelier,
  },
  {
    id: "fieldnotes",
    name: "Field Notes",
    domain: "fieldnotes.journal",
    discipline: "Independent publishing",
    blurb: "A journal issue with a strong visual voice, undermined by tiny type, low contrast and a page that outgrows its canvas.",
    image: FIELD_IMAGE,
    html: fieldnotes,
  },
  {
    id: "monogram",
    name: "Monogram",
    domain: "monogram.design",
    discipline: "Graphic design",
    blurb: "A restrained practice page that gets the fundamentals right. Use it to see a cleaner evidence ledger.",
    html: monogram,
  },
];

export function getSpecimen(id?: string | null): Specimen {
  return SPECIMENS.find((s) => s.id === id) ?? SPECIMENS[0];
}
