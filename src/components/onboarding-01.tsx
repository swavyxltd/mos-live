"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconChevronRight,
  IconCircleCheckFilled,
  IconCircleDashed,
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
  customContent?: React.ReactNode;
}

interface Onboarding01Props {
  steps?: OnboardingStep[];
  title?: string;
  onStepAction?: (step: OnboardingStep) => void;
  onNextStep?: (currentStepId: string) => void;
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
        className="mt-1 size-4.5 shrink-0 text-primary hidden sm:block"
        aria-hidden="true"
      />
    );
  }
  return (
    <IconCircleDashed
      className="mt-1 size-5 shrink-0 stroke-muted-foreground/40 hidden sm:block"
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

const defaultSteps: OnboardingStep[] = [
  {
    id: "document",
    title: "Send your first document",
    description:
      "Upload a PDF and send it for signature. You'll see how easy it is to get documents signed.",
    completed: true,
    actionLabel: "Upload document",
    actionHref: "#",
  },
  {
    id: "template",
    title: "Create a reusable template",
    description:
      "Save time by creating templates for documents you send frequently, like NDAs or contracts.",
    completed: false,
    actionLabel: "Create template",
    actionHref: "#",
  },
  {
    id: "team",
    title: "Invite your team",
    description:
      "Add team members to collaborate on documents and manage signing workflows together.",
    completed: false,
    actionLabel: "Invite team",
    actionHref: "#",
  },
  {
    id: "branding",
    title: "Customize your branding",
    description:
      "Add your logo and brand colors to create a professional signing experience for recipients.",
    completed: false,
    actionLabel: "Add branding",
    actionHref: "#",
  },
  {
    id: "api",
    title: "Explore the API",
    description:
      "Integrate document signing directly into your application with our developer-friendly API.",
    completed: false,
    actionLabel: "View API docs",
    actionHref: "#",
  },
  {
    id: "integrations",
    title: "Connect your tools",
    description:
      "Link Documenso with Zapier, Slack, or your CRM to automate your document workflows.",
    completed: false,
    actionLabel: "Browse integrations",
    actionHref: "#",
  },
];

export function Onboarding01({ 
  steps: propSteps, 
  title = "Get started with Documenso",
  onStepAction,
  onNextStep
}: Onboarding01Props = {}) {
  const steps = propSteps || defaultSteps;
  // Sync completed state from props
  const [currentSteps, setCurrentSteps] = useState<OnboardingStep[]>(steps);
  
  // Update steps when propSteps change (for dynamic completion tracking)
  useEffect(() => {
    if (propSteps) {
      setCurrentSteps(propSteps);
    }
  }, [propSteps]);
  
  // Start with the first step open by default
  const [openStepId, setOpenStepId] = useState<string | null>(() => {
    // Open the first incomplete step, or the first step if all are completed
    const firstIncomplete = steps.find((s) => !s.completed);
    return firstIncomplete?.id ?? steps[0]?.id ?? null;
  });
  const [dismissed, setDismissed] = useState(false);

  const completedCount = currentSteps.filter((s) => s.completed).length;
  const remainingCount = currentSteps.length - completedCount;

  const handleStepClick = (stepId: string) => {
    // If clicking the already open step, close it. Otherwise, open the clicked step (closing any other open step)
    setOpenStepId(openStepId === stepId ? null : stepId);
  };

  const handleNextStep = useCallback((currentStepId: string) => {
    const currentIndex = currentSteps.findIndex(s => s.id === currentStepId);
    if (currentIndex >= 0 && currentIndex < currentSteps.length - 1) {
      const nextStep = currentSteps[currentIndex + 1];
      setOpenStepId(nextStep.id);
      // Scroll to next step
      setTimeout(() => {
        const nextElement = document.querySelector(`[data-step-id="${nextStep.id}"]`);
        if (nextElement) {
          nextElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
    if (onNextStep) {
      onNextStep(currentStepId);
    }
  }, [currentSteps, onNextStep]);

  const handleBackStep = useCallback((currentStepId: string) => {
    const currentIndex = currentSteps.findIndex(s => s.id === currentStepId);
    if (currentIndex > 0) {
      const prevStep = currentSteps[currentIndex - 1];
      setOpenStepId(prevStep.id);
      // Scroll to previous step
      setTimeout(() => {
        const prevElement = document.querySelector(`[data-step-id="${prevStep.id}"]`);
        if (prevElement) {
          prevElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [currentSteps]);

  // Expose handleNextStep and handleBackStep via window for buttons to access
  useEffect(() => {
    (window as any).__onboardingNextStep = handleNextStep;
    (window as any).__onboardingBackStep = handleBackStep;
    return () => {
      delete (window as any).__onboardingNextStep;
      delete (window as any).__onboardingBackStep;
    };
  }, [handleNextStep, handleBackStep]);

  const handleStepAction = (step: OnboardingStep) => {
    if (onStepAction) {
      onStepAction(step);
    } else {
      setCurrentSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, completed: true } : s))
      );
    }
  };

  if (dismissed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Checklist dismissed</p>
          <button
            onClick={() => setDismissed(false)}
            className="mt-2 text-sm text-primary underline"
          >
            Show again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full bg-white p-4 text-card-foreground rounded-lg border border-border">
          <div className="mb-4 mr-2 flex flex-col justify-between sm:flex-row sm:items-center">
            <h3 className="ml-2 font-semibold text-foreground">
              {title}
            </h3>
            <div className="mt-2 flex items-center justify-end sm:mt-0">
              <CircularProgress
                completed={completedCount}
                total={currentSteps.length}
              />
              <div className="ml-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {remainingCount}
                </span>{" "}
                out of{" "}
                <span className="font-medium text-foreground">
                  {currentSteps.length} steps
                </span>{" "}
                left
              </div>
            </div>
          </div>

          <div className="space-y-0">
            {currentSteps.map((step, index) => {
              // Only the step matching openStepId should be open (accordion behavior)
              const isOpen = openStepId === step.id;
              const isFirst = index === 0;
              const prevStep = currentSteps[index - 1];
              const isPrevOpen = prevStep && openStepId === prevStep.id;

              const showBorderTop = !isFirst && !isOpen && !isPrevOpen;

              return (
                <div
                  key={step.id}
                  data-step-id={step.id}
                  className={cn(
                    "group",
                    showBorderTop && "border-t border-border"
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleStepClick(step.id)}
                    onKeyDown={(e) => {
                      // Don't handle keyboard events if user is typing in an input field
                      const target = e.target as HTMLElement
                      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('input, textarea, button')) {
                        return
                      }
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStepClick(step.id);
                      }
                    }}
                    className={cn(
                      "block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    <div
                      className={cn(
                        "relative overflow-hidden transition-colors"
                      )}
                    >
                      <div className="relative flex items-center justify-between gap-3 py-3 pl-4 pr-2">
                        <div className="flex w-full gap-3">
                          <div className="shrink-0 hidden sm:block">
                            <StepIndicator completed={step.completed} />
                          </div>
                          <div className="mt-0.5 grow w-full min-w-0">
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
                              {step.customContent ? (
                                step.customContent
                              ) : (
                                <>
                                  <p className="mt-2 text-sm text-muted-foreground sm:max-w-64 md:max-w-xs">
                                    {step.description}
                                  </p>
                                  {step.actionLabel && step.actionHref && (
                                    <Button
                                      size="sm"
                                      className="mt-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStepAction(step);
                                      }}
                                      asChild
                                    >
                                      <a href={step.actionHref}>{step.actionLabel}</a>
                                    </Button>
                                  )}
                                </>
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

