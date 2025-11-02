"use client";

import { Uploader } from "@/components/file-uploader/Uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VideoBlockData } from "@/lib/blockTypes";
import { useState } from "react";

interface VideoBlockEditorProps {
  data: VideoBlockData;
  onChange: (data: VideoBlockData) => void;
}

export function VideoBlockEditor({ data, onChange }: VideoBlockEditorProps) {
  const [videoData, setVideoData] = useState<VideoBlockData>(data);

  const handleChange = (field: keyof VideoBlockData, value: string) => {
    const updated = { ...videoData, [field]: value };
    setVideoData(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Video File</Label>
        <Uploader
          value={videoData.fileKey}
          onChange={(value) => handleChange("fileKey", value || "")}
        />
      </div>
      <div>
        <Label>Caption (optional)</Label>
        <Input
          placeholder="Add a caption"
          value={videoData.caption || ""}
          onChange={(e) => handleChange("caption", e.target.value)}
        />
      </div>
    </div>
  );
}
