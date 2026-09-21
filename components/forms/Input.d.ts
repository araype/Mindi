import React from 'react';
export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  helperText?: string;
  error?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
