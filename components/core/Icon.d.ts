import React from 'react';
export interface IconProps {
  name: 'chevronDown' | 'info' | 'check' | 'close' | 'message' | 'shield' | 'book' | 'user' | 'send' | 'heart' | 'bookmark' | 'home';
  size?: number;
  color?: string;
  /** Set when the icon is the only content conveying meaning (adds role="img"); omit for purely decorative icons next to text. */
  label?: string;
}
