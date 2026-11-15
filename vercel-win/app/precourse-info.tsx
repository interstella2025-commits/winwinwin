import FlowText from '../components/flow-text';
export default function PrecourseInfo() {
 return <section id="information" className="precourse-info" aria-labelledby="precourse-heading">
  <p className="precourse-kicker"><FlowText parts={["Expert to Enterprise WIN講師班 · ","90分鐘前導課"]}/></p>
  <h2 id="precourse-heading"><span className="heading-phrase">從專家到企業家</span><br/><span className="heading-phrase">先從 <em>90 分鐘</em>開始</span></h2>
  <p className="precourse-lead"><FlowText parts={["跟著 WIN 博士認識銷講、招商與募資的核心思路，"]}/><br className="precourse-break"/><FlowText parts={["了解專業走向事業的學習方向。"]}/></p>
  <dl className="precourse-details">
   <div className="format-detail"><dt>課程形式</dt><dd className="keep-line">線上直播或實體課（台北場）</dd></div>
   <div><dt>課程長度</dt><dd>90 分鐘</dd></div>
   <div><dt>授課講師</dt><dd>林嘉宏 WIN 博士</dd></div>
  </dl>
  <p className="precourse-price">前導課費用 <strong>NT$399</strong></p>
  <p className="precourse-donation"><FlowText parts={["將全數捐予，","「國際青少年希望教育計劃」。"]}/></p>
  <a className="precourse-cta" href="#apply">報名90分鐘前導課 <span aria-hidden="true">→</span></a>
 </section>;
}
