import ReactMarkdown from "react-markdown";

/**
 * Safe by construction: react-markdown never renders raw HTML, and its default
 * urlTransform strips javascript: links. Images are shown as text (air-gapped: no remote loads).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
          img: ({ alt }) => <span className="text-muted-foreground">[image: {alt}]</span>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
