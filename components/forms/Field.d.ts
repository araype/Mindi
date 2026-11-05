import React from 'react';
export interface FieldProps { id: string; label: string; type?: string; required?: boolean; autoComplete?: string; }
export interface CheckProps { name?: string; children?: React.ReactNode; }
