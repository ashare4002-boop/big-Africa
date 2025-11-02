"use client";

import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { TextBlockData } from "@/lib/blockTypes";
import { useState } from "react";

interface TextBlockEditorProps {
  data: TextBlockData;
  onChange: (data: TextBlockData) => void;
}

export function TextBlockEditor({ data, onChange }: TextBlockEditorProps) {
  const [content, setContent] = useState(data.content || "");

  const handleChange = (value: string) => {
    setContent(value);
    onChange({ content: value });
  };

  return (
    <div className="w-full">
      <RichTextEditor
        field={{
          value: content,
          onChange: handleChange,
        }}
      />
    </div>
  );
}
