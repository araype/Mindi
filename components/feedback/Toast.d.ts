import React from 'react';
export interface ToastProps { tone?: 'brand' | 'success' | 'danger'; urgent?: boolean; children?: React.ReactNode; }
