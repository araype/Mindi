import React from 'react';
export interface Source { label: string; href?: string; }
export interface SourceListProps {
  /** Use real sources only. If demonstrating the pattern without real sources, label each item "Ejemplo de fuente". */
  sources: Source[];
}
