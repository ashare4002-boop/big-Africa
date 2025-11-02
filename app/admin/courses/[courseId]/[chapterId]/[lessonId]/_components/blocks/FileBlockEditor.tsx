"use client";

import { Uploader } from "@/components/file-uploader/Uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileBlockData } from "@/lib/blockTypes";
import { useState } from "react";

interface FileBlockEditorProps {
  data: FileBlockData;
  onChange: (data: FileBlockData) => void;
}

export function FileBlockEditor({ data, onChange }: FileBlockEditorProps) {
  const [fileData, setFileData] = useState<FileBlockData>(data);

  const handleChange = (field: keyof FileBlockData, value: string) => {
    const updated = { ...fileData, [field]: value };
    setFileData(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>File</Label>
        <Uploader
          value={fileData.fileKey}
          onChange={(value) => handleChange("fileKey", value || "")}
        />
      </div>
      <div>
        <Label>File Name</Label>
        <Input
          placeholder="e.g., lecture-notes.pdf"
          value={fileData.fileName}
          onChange={(e) => handleChange("fileName", e.target.value)}
        />
      </div>
      <div>
        <Label>File Type</Label>
        <Input
          placeholder="e.g., PDF, DOCX, MP3"
          value={fileData.fileType}
          onChange={(e) => handleChange("fileType", e.target.value)}
        />
      </div>
    </div>
  );
}
