import Link from "next/link";
import Image from "next/image";
import { urlForImage } from "@/lib/sanity/client";

export interface PortableMarkDef {
  _type: string;
  _key: string;
  href?: string;
}

export interface PortableSpan {
  _type: string;
  _key: string;
  text: string;
  marks?: string[];
}

export interface PortableBlock {
  _type: string;
  _key: string;
  style?: string;
  listItem?: "bullet" | "number";
  level?: number;
  children?: PortableSpan[];
  markDefs?: PortableMarkDef[];
  // image block fields
  alt?: string;
  asset?: { _ref: string };
}

/**
 * Renders the inline spans of a block, honoring strong/em marks and link
 * annotations (markDefs). Link marks render as styled anchors; internal links
 * (same-origin) use next/link for client navigation.
 */
function renderSpans(
  children: PortableSpan[] | undefined,
  markDefs: PortableMarkDef[] | undefined
) {
  if (!children) return null;
  return children.map((span) => {
    const isStrong = span.marks?.includes("strong");
    const isEm = span.marks?.includes("em");
    // A mark that isn't a decorator is a markDef key (e.g. a link annotation).
    const linkDef = span.marks
      ?.map((m) => markDefs?.find((d) => d._key === m && d._type === "link"))
      .find(Boolean);

    let node: React.ReactNode = span.text;
    if (isStrong) node = <strong className="font-semibold text-foreground">{node}</strong>;
    if (isEm) node = <em>{node}</em>;

    if (linkDef?.href) {
      const href = linkDef.href;
      const isInternal = href.startsWith("/");
      node = isInternal ? (
        <Link
          href={href}
          className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
        >
          {node}
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
        >
          {node}
        </a>
      );
    }

    return <span key={span._key}>{node}</span>;
  });
}

/**
 * Renders Portable Text blocks into styled HTML with proper visual hierarchy.
 * Groups consecutive list items into <ul>/<ol> elements.
 *
 * Extracted from the blog post page, which had the only complete implementation.
 * The buying-guide page carried a stub that mapped blocks to bare <h2>/<h3>/<p>
 * and leaned on `prose prose-zinc` for all spacing — but
 * @tailwindcss/typography was never installed, so those classes matched nothing
 * and every guide rendered as one undifferentiated wall of text with headings
 * indistinguishable from body copy. The stub also silently dropped bold, italic,
 * links, lists and inline images.
 */
export function ArticleBody({
  body,
  className = "",
}: {
  body: PortableBlock[];
  className?: string;
}) {
  const elements: React.ReactNode[] = [];
  let listBuffer: PortableBlock[] = [];
  let listType: "bullet" | "number" | null = null;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((b) => (
      <li key={b._key} className="leading-relaxed">
        {renderSpans(b.children, b.markDefs)}
      </li>
    ));
    if (listType === "number") {
      elements.push(
        <ol
          key={`ol-${listBuffer[0]._key}`}
          className="my-5 ml-5 list-decimal space-y-2 text-foreground/80 marker:text-primary-500"
        >
          {items}
        </ol>
      );
    } else {
      elements.push(
        <ul
          key={`ul-${listBuffer[0]._key}`}
          className="my-5 ml-5 list-disc space-y-2 text-foreground/80 marker:text-primary-400"
        >
          {items}
        </ul>
      );
    }
    listBuffer = [];
    listType = null;
  };

  for (const block of body) {
    // Inline image blocks (Portable Text image type).
    if (block._type === "image" && block.asset?._ref) {
      flushList();
      elements.push(
        <figure key={block._key} className="my-8">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              src={urlForImage({ asset: block.asset }).width(800).height(600).url()}
              alt={block.alt || ""}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          {block.alt && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {block.alt}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    if (block._type !== "block") continue;

    if (block.listItem) {
      if (listType && listType !== block.listItem) flushList();
      listType = block.listItem;
      listBuffer.push(block);
      continue;
    }

    flushList();
    const content = renderSpans(block.children, block.markDefs);

    switch (block.style) {
      case "h2":
        elements.push(
          <h2
            key={block._key}
            className="mt-12 mb-4 text-2xl font-semibold tracking-tight text-foreground scroll-mt-24"
          >
            {content}
          </h2>
        );
        break;
      case "h3":
        elements.push(
          <h3
            key={block._key}
            className="mt-8 mb-3 text-xl font-semibold tracking-tight text-foreground"
          >
            {content}
          </h3>
        );
        break;
      case "h4":
        elements.push(
          <h4 key={block._key} className="mt-6 mb-2 text-lg font-semibold text-foreground">
            {content}
          </h4>
        );
        break;
      case "blockquote":
        elements.push(
          <blockquote
            key={block._key}
            className="my-6 border-l-4 border-primary-300 bg-primary-50/50 py-3 pl-5 pr-4 text-foreground/80 italic rounded-r-lg"
          >
            {content}
          </blockquote>
        );
        break;
      default:
        elements.push(
          <p key={block._key} className="my-5 text-base leading-7 text-foreground/80">
            {content}
          </p>
        );
    }
  }

  flushList();

  // The first heading carries mt-12, which is unwanted directly under a page
  // header. Callers that need it flush can pass a negative top margin.
  return <div className={`[&>*:first-child]:mt-0 ${className}`}>{elements}</div>;
}
