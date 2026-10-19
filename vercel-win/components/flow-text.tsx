/** Keep short phrases and Chinese word endings together on narrow screens. */
export default function FlowText({parts}:{parts:readonly string[]}) {
 return <>{parts.map((part,index)=>{const tail=part.match(/[\p{Script=Han}]{2,3}[，。、；：」！？]*$/u)?.[0];return <span className="wrap-unit" key={index}>{tail&&tail.length<part.length?<>{part.slice(0,-tail.length)}<span className="wrap-tail">{tail}</span></>:part}</span>})}</>;
}
