/** Shared price line. Clauses stay intact and may wrap only after 「，」. */
const PARTS = ['實體課（台北場）3 小時，', 'NT$399；線上課（直播）90 分鐘，', '限時免費'] as const;
export default function PriceFacts() {
 return <span className="price-facts">{PARTS.map(part => <span className={part === '限時免費' ? 'wrap-unit price-free' : 'wrap-unit'} key={part}>{part}</span>)}</span>;
}
