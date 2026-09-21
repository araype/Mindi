import React from 'react';
export interface GuidanceCardProps {
  title?: string;
  children?: React.ReactNode;
  /** Short note on what this guidance can't determine, and when to see a professional instead. */
  limits?: React.ReactNode;
}
