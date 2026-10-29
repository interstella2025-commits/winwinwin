const items: [string, string][] = [
  ['準備加盟擴張的', '事業經營者'],
  ['想提高單價的', '講師與顧問'],
  ['正在準備募資的', '創業家'],
  ['想建立銷售現金流的', '企業主'],
  ['準備走向更大市場的', '品牌經營者'],
  ['沒有演講經驗，想要進步神速的', '企業家／創業家'],
];
export default function Audience() {
  return <section className="audience" aria-labelledby="audience-heading">
    <h2 id="audience-heading"><span className="nw">如果你的事業</span><br/><span className="nw">正準備進入<em>下一個階段</em></span></h2>
    <ul className="audience-grid">{items.map(([a, b]) => <li key={b + a}><span className="aud-lead">{a.split(/(?<=，)/).map(p => <span className="nw" key={p}>{p}</span>)}</span><strong>{b}</strong></li>)}</ul>
    <p className="audience-close"><span className="nw">帶著你的專業、</span><span className="nw">產品或事業題目<em>進場</em>。</span></p>
  </section>;
}
