"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QuizBlockData } from "@/lib/blockTypes";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface QuizBlockEditorProps {
  data: QuizBlockData;
  onChange: (data: QuizBlockData) => void;
}

export function QuizBlockEditor({ data, onChange }: QuizBlockEditorProps) {
  const [quizData, setQuizData] = useState<QuizBlockData>(data);

  const handleChange = (field: keyof QuizBlockData, value: any) => {
    const updated = { ...quizData, [field]: value };
    setQuizData(updated);
    onChange(updated);
  };

  const addOption = () => {
    const options = quizData.options || [];
    handleChange("options", [...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const options = [...(quizData.options || [])];
    options[index] = value;
    handleChange("options", options);
  };

  const removeOption = (index: number) => {
    const options = quizData.options?.filter((_, i) => i !== index);
    handleChange("options", options);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label>Question</Label>
        <Textarea
          placeholder="Enter your question"
          value={quizData.question}
          onChange={(e) => handleChange("question", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Question Type</Label>
        <Select
          value={quizData.type}
          onValueChange={(value) => handleChange("type", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
            <SelectItem value="true-false">True/False</SelectItem>
            <SelectItem value="short-answer">Short Answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {quizData.type === "multiple-choice" && (
        <div className="space-y-3">
          <Label>Options</Label>

          <div className="space-y-3 mt-2">
            {(quizData.options || []).map((option, index) => (
              <div key={index} className="flex gap-3">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeOption(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {quizData.type === "true-false" && (
        <div className="space-y-2">
          <Label>Correct Answer</Label>
          <Select
            value={String(quizData.correctAnswer)}
            onValueChange={(value) => handleChange("correctAnswer", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {quizData.type === "multiple-choice" && (
        <div className="space-y-2">
          <Label>Correct Answer (option number)</Label>
          <Input
            type="number"
            placeholder="e.g., 0 for first option"
            value={quizData.correctAnswer}
            onChange={(e) =>
              handleChange("correctAnswer", parseInt(e.target.value))
            }
          />
        </div>
      )}

      {quizData.type === "short-answer" && (
        <div className="space-y-2">
          <Label>Correct Answer</Label>
          <Input
            placeholder="Enter the correct answer"
            value={quizData.correctAnswer}
            onChange={(e) => handleChange("correctAnswer", e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Explanation (optional)</Label>
        <Textarea
          placeholder="Explain the correct answer"
          value={quizData.explanation || ""}
          onChange={(e) => handleChange("explanation", e.target.value)}
        />
      </div>
    </div>
  );
}
