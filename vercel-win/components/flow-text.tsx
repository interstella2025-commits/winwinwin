/** Keep short, meaningful phrases together on narrow screens. */
export default function FlowText({parts}:{parts:readonly string[]}) {
 return <>{parts.map((part,index)=><span className="wrap-unit" key={index}>{part}</span>)}</>;
}
