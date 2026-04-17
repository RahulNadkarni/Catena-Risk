import { Fragment } from "react";

/** Minimal **bold** support for underwriter narrative paragraphs. */
export function InlineMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          <InlineLine text={p} />
        </p>
      ))}
    </div>
  );
}

function InlineLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={j} className="text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <Fragment key={j}>{part}</Fragment>;
      })}
    </>
  );
}
