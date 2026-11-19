import FlowText from '../components/flow-text';
import PriceFacts from '../components/price-facts';
export default function PrecourseInfo() {
 return <section id="information" className="precourse-info" aria-labelledby="precourse-heading">
  <p className="precourse-kicker"><FlowText parts={["Expert to Enterprise WIN講師班 · ","90分鐘前導課"]}/></p>
  <h2 id="precourse-heading"><span className="heading-phrase">從專家到企業家</span><br/><span className="heading-phrase">立即報名前導課</span></h2>
  <p className="precourse-lead"><FlowText parts={["跟著 WIN 博士認識銷講、招商與募資的核心思路，"]}/><br className="precourse-break"/><FlowText parts={["了解專業走向事業的學習方向。"]}/></p>
  <dl className="precourse-details">
   <div className="format-detail price-detail"><dt>費用</dt><dd><PriceFacts/></dd></div>
   <div><dt>授課講師</dt><dd>林嘉宏 WIN 博士</dd></div>
  </dl>
  <a className="precourse-cta" href="#apply">報名90分鐘前導課 <span aria-hidden="true">→</span></a>
 </section>;
}
