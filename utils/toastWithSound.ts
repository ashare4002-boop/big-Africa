import { toast } from "sonner";

export function toastWithSound(
  type: "success" | "error" | "info",
  message: string
) {
  const audio = new Audio(`/api/sound/${type}`);
  audio.play().catch(() => {}); // prevent errors if audio fails

  return toast[type](message);
}
