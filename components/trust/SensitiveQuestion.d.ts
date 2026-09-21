import React from 'react';
export interface SensitiveQuestionProps {
  question: string;
  /** Completes "Te pregunto esto porque ___" — always explain why before asking. */
  reason?: string;
  onAnswer?: () => void;
  onDecline?: () => void;
}
