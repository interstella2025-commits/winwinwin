/** Two price rows. A row may wrap only after 「，」. */
export default function PriceFacts() {
 return <span className="price-facts">
  <span className="price-line"><span className="wrap-unit">線上課（直播）90 分鐘，</span><span className="wrap-unit price-free">限時免費</span></span>
  <span className="price-line"><span className="wrap-unit">實體課（台北場）3 小時，</span><span className="wrap-unit">NT$399</span></span>
 </span>;
}
