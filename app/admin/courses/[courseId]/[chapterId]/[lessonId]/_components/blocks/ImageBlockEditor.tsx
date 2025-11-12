"use client";

import { Uploader } from "@/components/file-uploader/Uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageBlockData } from "@/lib/blockTypes";
import { useState } from "react";

interface ImageBlockEditorProps {
  data: ImageBlockData;
  onChange: (data: ImageBlockData) => void;
}

export function ImageBlockEditor({ data, onChange }: ImageBlockEditorProps) {
  const [imageData, setImageData] = useState<ImageBlockData>(data);

  const handleChange = (field: keyof ImageBlockData, value: string) => {
    const updated = { ...imageData, [field]: value };
    setImageData(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label>Image</Label>
        <Uploader
          fileTypeAccepted="image"
          value={imageData.fileKey}
          onChange={(value) => handleChange("fileKey", value || "")}
        />
      </div>
      <div className="grid gap-2">
        <Label>Alt Text</Label>
        <Input
          placeholder="Describe the image"
          value={imageData.alt || ""}
          onChange={(e) => handleChange("alt", e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>Caption (optional)</Label>
        <Input
          placeholder="Add a caption"
          value={imageData.caption || ""}
          onChange={(e) => handleChange("caption", e.target.value)}
        />
      </div>
    </div>
  );
}
