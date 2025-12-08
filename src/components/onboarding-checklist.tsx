"use client";

import { useState } from "react";
import {
  IconCircleCheckFilled,
  IconCircleDashed,
  IconChevronRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel?: string;
  actionHref?: string;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  title?: string;
}

function CircularProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const progress = total > 0 ? ((total - completed) / total) * 100 : 0;
  const strokeDashoffset = 100 - progress;

  return (
    <svg
      className="-rotate-90 scale-y-[-1]"
      height="14"
      width="14"
      viewBox="0 0 14 14"
    >
      <circle
        className="stroke-muted"
        cx="7"
        cy="7"
        fill="none"
        r="6"
        strokeWidth="2"
        pathLength="100"
      />
      <circle
        className="stroke-primary"
        cx="7"
        cy="7"
        fill="none"
        r="6"
        strokeWidth="2"
        pathLength="100"
        strokeDasharray="100"
        strokeLinecap="round"
        style={{ strokeDashoffset }}
      />
    </svg>
  );
}

function StepIndicator({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <IconCircleCheckFilled
        className="mt-1 size-4.5 shrink-0 text-primary"
        aria-hidden="true"
      />
    );
  }
  return (
    <IconCircleDashed
      className="mt-1 size-5 shrink-0 stroke-muted-foreground/40"
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

export function OnboardingChecklist({ 
  steps, 
  title = "Get started with Madrasah OS" 
}: OnboardingChecklistProps) {
  const [openStepId, setOpenStepId] = useState<string | null>(() => {
    const firstIncomplete = steps.find((s) => !s.completed);
    return firstIncomplete?.id ?? steps[0]?.id ?? null;
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const remainingCount = steps.length - completedCount;

  const handleStepClick = (stepId: string) => {
    setOpenStepId(openStepId === stepId ? null : stepId);
  };

  return (
    <div className="w-full max-w-xl">
      <div className="w-full rounded-lg border bg-card p-4 text-card-foreground shadow-xs">
        <div className="mb-4 mr-2 flex flex-col justify-between sm:flex-row sm:items-center">
          <h3 className="ml-2 font-semibold text-foreground">
            {title}
          </h3>
          <div className="mt-2 flex items-center justify-end sm:mt-0">
            <CircularProgress
              completed={remainingCount}
              total={steps.length}
            />
            <div className="ml-1.5 mr-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {remainingCount}
              </span>{" "}
              out of{" "}
              <span className="font-medium text-foreground">
                {steps.length} steps
              </span>{" "}
              left
            </div>
          </div>
        </div>

        <div className="space-y-0">
          {steps.map((step, index) => {
            const isOpen = openStepId === step.id;
            const isFirst = index === 0;
            const prevStep = steps[index - 1];
            const isPrevOpen = prevStep && openStepId === prevStep.id;

            const showBorderTop = !isFirst && !isOpen && !isPrevOpen;

            return (
              <div
                key={step.id}
                className={cn(
                  "group",
                  isOpen && "rounded-lg",
                  showBorderTop && "border-t border-border"
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleStepClick(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleStepClick(step.id);
                    }
                  }}
                  className={cn(
                    "block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isOpen && "rounded-lg"
                  )}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-lg transition-colors",
                      isOpen && "border border-border bg-muted"
                    )}
                  >
                    <div className="relative flex items-center justify-between gap-3 py-3 pl-4 pr-2">
                      <div className="flex w-full gap-3">
                        <div className="shrink-0">
                          <StepIndicator completed={step.completed} />
                        </div>
                        <div className="mt-0.5 grow">
                          <h4
                            className={cn(
                              "font-semibold",
                              step.completed
                                ? "text-primary"
                                : "text-foreground"
                            )}
                          >
                            {step.title}
                          </h4>
                          <div
                            className={cn(
                              "overflow-hidden transition-all duration-200",
                              isOpen ? "h-auto opacity-100" : "h-0 opacity-0"
                            )}
                          >
                            <p className="mt-2 text-sm text-muted-foreground sm:max-w-64 md:max-w-xs">
                              {step.description}
                            </p>
                            {step.actionLabel && step.actionHref && (
                              <Button
                                size="sm"
                                className="mt-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = step.actionHref!;
                                }}
                                asChild
                              >
                                <a href={step.actionHref}>{step.actionLabel}</a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isOpen && (
                        <IconChevronRight
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

