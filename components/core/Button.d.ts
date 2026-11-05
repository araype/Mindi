import React from 'react';
export interface ButtonProps {
  /** primary: magenta sólido · outline: contorno · white: sobre fondos magenta · nav: pill del menú */
  variant?: 'primary' | 'outline' | 'white' | 'nav';
  /** Con href se dibuja un enlace <a>. */
  href?: string;
  block?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}
