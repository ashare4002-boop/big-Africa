export type ApiResponse<T = undefined> = {
    status: "success" | "error" | "info";
    message: string;
    sound: "success" | "error" | "info";
    data?: T;
}