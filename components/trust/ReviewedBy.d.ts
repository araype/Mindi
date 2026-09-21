import React from 'react';
export interface ReviewedByProps {
  /** Placeholder text like "Nombre del profesional / especialidad" until real reviewers exist. */
  name: string;
  role?: string;
  date?: string;
  /** Defaults true — keeps a visible "placeholder" note until Mindi has real clinical review in place. Never set false without real, authorized reviewer info. */
  isPlaceholder?: boolean;
}
