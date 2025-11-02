"use client";

import { FileBlockData } from "@/lib/blockTypes";
import { useConstructUrl } from "@/hooks/use-construct-url";
import { Button } from "@/components/ui/button";
import { Download, FileIcon } from "lucide-react";

interface FileBlockRendererProps {
  data: FileBlockData;
}

export function FileBlockRenderer({ data }: FileBlockRendererProps) {
  const fileUrl = useConstructUrl(data.fileKey);

  if (!fileUrl) return null;

  return (
    <div className="my-6 border rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded">
          <FileIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium">{data.fileName}</p>
          <p className="text-sm text-muted-foreground">{data.fileType}</p>
        </div>
      </div>
      <Button asChild variant="outline">
        <a href={fileUrl} download={data.fileName} target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4 mr-2" />
          Download
        </a>
      </Button>
    </div>
  );
}
