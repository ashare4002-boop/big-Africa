"use client";

import { QuizBlockData } from "@/lib/blockTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface QuizBlockRendererProps {
  data: QuizBlockData;
}

export function QuizBlockRenderer({ data }: QuizBlockRendererProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = () => {
    let correct = false;

    if (data.type === "multiple-choice") {
      correct = parseInt(selectedAnswer) === data.correctAnswer;
    } else if (data.type === "true-false") {
      correct = selectedAnswer === String(data.correctAnswer);
    } else if (data.type === "short-answer") {
      correct =
        selectedAnswer.toLowerCase().trim() ===
        String(data.correctAnswer).toLowerCase().trim();
    }

    setIsCorrect(correct);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSelectedAnswer("");
    setSubmitted(false);
    setIsCorrect(false);
  };

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle className="text-lg">Quiz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">{data.question}</p>

        {data.type === "multiple-choice" && data.options && (
          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            disabled={submitted}
          >
            {data.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={String(index)} id={`option-${index}`} />
                <Label
                  htmlFor={`option-${index}`}
                  className="cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {data.type === "true-false" && (
          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            disabled={submitted}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="cursor-pointer">
                True
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="cursor-pointer">
                False
              </Label>
            </div>
          </RadioGroup>
        )}

        {data.type === "short-answer" && (
          <Input
            placeholder="Your answer"
            value={selectedAnswer}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            disabled={submitted}
          />
        )}

        {submitted && (
          <div
            className={`p-4 rounded-lg ${
              isCorrect ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-600 dark:text-green-400">
                    Correct!
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Incorrect
                  </span>
                </>
              )}
            </div>
            {data.explanation && (
              <p className="text-sm">{data.explanation}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!submitted ? (
            <Button onClick={handleSubmit} disabled={!selectedAnswer}>
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleReset} variant="outline">
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
