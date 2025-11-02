import { TextBlockData } from "@/lib/blockTypes";

interface TextBlockRendererProps {
  data: TextBlockData;
}

export function TextBlockRenderer({ data }: TextBlockRendererProps) {
  return (
    <div
      className="prose dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  );
}
