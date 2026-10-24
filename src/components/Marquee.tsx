export function Marquee({ text }: { text: string }) {
  const content = text || "暂无公告";
  return (
    <div className="marquee-container">
      <div className="marquee-track">
        <span className="px-6">{content}</span>
        <span className="px-6" aria-hidden="true">
          {content}
        </span>
      </div>
    </div>
  );
}
