/** Two price rows. A row may wrap only after 「，」. NT$399、90 分鐘、3 小時、限時免費 stay intact. */
export default function PriceFacts() {
 return <span className="price-facts">
  <span className="price-line"><span className="wrap-unit">線上課（直播）<span className="nobr">90 分鐘</span>，</span><span className="wrap-unit nobr price-free">限時免費</span></span>
  <span className="price-line"><span className="wrap-unit">實體課（台北場）<span className="nobr">3 小時</span>，</span><span className="wrap-unit nobr">NT$399</span></span>
 </span>;
}
