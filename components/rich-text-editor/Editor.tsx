"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Menubar } from "./Menubar";
import TextAlign from "@tiptap/extension-text-align";

export function RichTextEditor({ field }: { field: any }) {
  // Prevent Tiptap from trying to render during SSR which causes
  // hydration mismatches in Next.js. Setting `immediatelyRender: false`
  // tells the hook not to render until the client run.
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],

    editorProps: {
      attributes: {
        class:
          "min-h-[300px] p-4 focus: outline-none prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert !w-full !max-w-none",
      },
    },

    onUpdate: ({ editor }) => {
      field.onChange(JSON.stringify(editor.getJSON()));
    },

    content: field.value ? JSON.parse(field.value): '<p> Hello 🖐️</p>',
    // Avoid hydration mismatch when server-side rendering
    immediatelyRender: false,
  });

  return (
    <div className="w-full border border-input rounded-lg overflow-hidden dark: bg-input/30 ">
      {/* Only render the menubar when editor is initialized on the client */}
      {editor ? <Menubar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
} 
