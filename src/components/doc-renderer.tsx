import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface DocRendererProps {
  markdown: string;
}

// Convert text to a slug suitable for anchor IDs.
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (
    node &&
    typeof node === "object" &&
    "props" in node &&
    (node as { props?: { children?: React.ReactNode } }).props
  ) {
    return extractText(
      (node as { props: { children?: React.ReactNode } }).props.children,
    );
  }
  return "";
}

export function DocRenderer({ markdown }: DocRendererProps) {
  return (
    <article className="prose prose-invert prose-venusus max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => {
            const id = slugify(extractText(children));
            return (
              <h1 id={id} className="scroll-mt-24">
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const id = slugify(extractText(children));
            return (
              <h2 id={id} className="scroll-mt-24">
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = slugify(extractText(children));
            return (
              <h3 id={id} className="scroll-mt-24">
                {children}
              </h3>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}

// Server-side: parse markdown for headings to build the TOC.
export function extractHeadings(markdown: string) {
  const lines = markdown.split("\n");
  const headings: { id: string; text: string; level: number }[] = [];
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/`/g, "");
      headings.push({ id: slugify(text), text, level });
    }
  }
  return headings;
}
