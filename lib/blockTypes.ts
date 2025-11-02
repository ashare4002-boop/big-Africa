import { z } from "zod";

export enum BlockType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  QUIZ = "QUIZ",
  FILE = "FILE",
}

export const textBlockDataSchema = z.object({
  content: z.string(),
});

export const imageBlockDataSchema = z.object({
  fileKey: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

export const videoBlockDataSchema = z.object({
  fileKey: z.string(),
  caption: z.string().optional(),
});

export const quizBlockDataSchema = z.object({
  question: z.string(),
  type: z.enum(["multiple-choice", "true-false", "short-answer"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.number()]),
  explanation: z.string().optional(),
});

export const fileBlockDataSchema = z.object({
  fileKey: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().optional(),
});

export const lessonBlockSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(BlockType),
  position: z.number(),
  data: z.union([
    textBlockDataSchema,
    imageBlockDataSchema,
    videoBlockDataSchema,
    quizBlockDataSchema,
    fileBlockDataSchema,
  ]),
});

export type TextBlockData = z.infer<typeof textBlockDataSchema>;
export type ImageBlockData = z.infer<typeof imageBlockDataSchema>;
export type VideoBlockData = z.infer<typeof videoBlockDataSchema>;
export type QuizBlockData = z.infer<typeof quizBlockDataSchema>;
export type FileBlockData = z.infer<typeof fileBlockDataSchema>;
export type LessonBlockSchema = z.infer<typeof lessonBlockSchema>;

export type BlockData =
  | TextBlockData
  | ImageBlockData
  | VideoBlockData
  | QuizBlockData
  | FileBlockData;

export interface LessonBlock {
  id: string;
  type: BlockType;
  position: number;
  data: BlockData;
  createdAt: Date;
  updatedAt: Date;
  lessonId: string;
}
