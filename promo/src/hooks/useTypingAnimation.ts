import { useEffect, useRef, useState } from 'react';

export interface TerminalStep {
  command: string;
  output: string[];
}

interface State {
  stepIndex: number;
  typedCommand: string;
  visibleOutputLines: number;
  showCursor: boolean;
  phase: 'typing' | 'pause' | 'output' | 'wait';
}

export function useTypingAnimation(steps: TerminalStep[], active: boolean) {
  const [state, setState] = useState<State>({
    stepIndex: 0,
    typedCommand: '',
    visibleOutputLines: 0,
    showCursor: true,
    phase: 'typing',
  });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!active) return;

    const step = steps[state.stepIndex];
    if (!step) return;

    clearTimeout(timerRef.current);

    if (state.phase === 'typing') {
      if (state.typedCommand.length < step.command.length) {
        timerRef.current = setTimeout(() => {
          setState((s) => ({
            ...s,
            typedCommand: step.command.slice(0, s.typedCommand.length + 1),
          }));
        }, 40);
      } else {
        timerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, phase: 'pause' }));
        }, 400);
      }
    } else if (state.phase === 'pause') {
      timerRef.current = setTimeout(() => {
        setState((s) => ({ ...s, phase: 'output', showCursor: false }));
      }, 300);
    } else if (state.phase === 'output') {
      if (state.visibleOutputLines < step.output.length) {
        timerRef.current = setTimeout(() => {
          setState((s) => ({
            ...s,
            visibleOutputLines: s.visibleOutputLines + 1,
          }));
        }, 120);
      } else {
        timerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, phase: 'wait' }));
        }, 2500);
      }
    } else if (state.phase === 'wait') {
      const nextIndex = (state.stepIndex + 1) % steps.length;
      setState({
        stepIndex: nextIndex,
        typedCommand: '',
        visibleOutputLines: 0,
        showCursor: true,
        phase: 'typing',
      });
    }

    return () => clearTimeout(timerRef.current);
  }, [active, state, steps]);

  const step = steps[state.stepIndex];
  return {
    currentStep: state.stepIndex,
    displayedCommand: state.typedCommand,
    displayedOutput: step ? step.output.slice(0, state.visibleOutputLines) : [],
    cursorVisible: state.showCursor,
  };
}
