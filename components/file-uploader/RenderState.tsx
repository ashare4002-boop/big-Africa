import { cn } from "@/lib/utils";
import { CloudUploadIcon, ImageIcon, Loader2, XIcon } from "lucide-react";
import { Button } from "../ui/button";
import Image from "next/image";

interface RenderErrorStateProps {
  retryUpload: () => void;
}



export function RenderEmptyState({ isDragActive }: { isDragActive: boolean }) {
  return (
    <div className="text-center">
      <div className="flex items-center mx-auto justify-center size-12 rounded-full bg-muted mb-4">
        <CloudUploadIcon
          className={cn(
            "size-6 text-muted-foreground",
            isDragActive && "text-primary"
          )}
        />
      </div>
      <p className="text-base font-semibold text-foreground">
        Drop your files here or{" "}
        <span className="text-primary font-bold cursor-pointer">
          click to upload
        </span>
      </p>
    </div>
  );
}


export function RenderErrorState({ retryUpload }: RenderErrorStateProps) {
  return (
    <div className="text-destructive text-center ">
      <div className="flex items-center mx-auto justify-center size-12 rounded-full bg-/30 mb-4">
        <ImageIcon className={cn("size-6 text-destructive")} />
      </div>

      <p className="text-base font-semibold">Upload failed</p>
      <Button className="mt-4" type="button" onClick={retryUpload}>
        Retry Again
      </Button>
    </div>
  );
}



 export function RenderUploadedState({previewUrl, isDeleting, handleRemoveFile}: {previewUrl?: string;
  isDeleting: boolean,
  handleRemoveFile: () => void;

 }) {
      if (!previewUrl) return null;
      return (
        <div className="relative w-full h-64">
        <Image src = {previewUrl}  alt = "Uploaded File" fill className="object-contain p-2"  unoptimized />
        <Button variant="destructive" size = "icon" className={cn(
          'absolute top-4 right-4')}
          onClick={handleRemoveFile}
          disabled = {isDeleting}>

         {isDeleting ? (
          <Loader2 className="size-4 animate-spin"/>
         ): (
            <XIcon className="size-4" />
         )}
        </Button>
        </div>
      )
 }


  export function RenderUploadingState({progress, file} : {progress: number;  file: File}) {
            return (
              <div className="text-center flex justify-center flex-col">
                <p>{progress}</p>
             <p className="mt-2 text-sm font-medium text-foreground">Uploading...</p>
             <p className="mt-1 text-xs text-muted-foreground truncate max-w-xs">{file.name}</p>
              </div>
            )
  }