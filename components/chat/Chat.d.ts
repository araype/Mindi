import React from 'react';
export interface ChatProps { dark?: boolean; status?: string; children?: React.ReactNode; }
export interface BubbleProps { from?: 'bot' | 'me'; dark?: boolean; example?: string; children?: React.ReactNode; }
export interface ScaleProps { labels: string[]; onPick?: (value: number, label: string) => void; }
export interface AreaBarProps { label: string; pct: number; }
