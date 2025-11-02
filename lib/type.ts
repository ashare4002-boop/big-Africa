export type ApiResponse = {
    status: "success" | "error" | "info";
    message: string;
    sound: "success" | "error" | "info";
}