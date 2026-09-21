import React from 'react';
export interface SelectProps {
  label?: string;
  options?: string[];
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}
