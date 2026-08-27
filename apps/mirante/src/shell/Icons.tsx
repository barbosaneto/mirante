import type { ReactNode } from "react";

interface IconProps {
  children: ReactNode;
}

function Icon({ children }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

export function LayersIcon() {
  return (
    <Icon>
      <path d="m4 8 8-4 8 4-8 4-8-4Z" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
    </Icon>
  );
}

export function UserIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
    </Icon>
  );
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="m4 11 8-7 8 7" />
      <path d="M6.5 9.5V20h11V9.5M10 20v-6h4v6" />
    </Icon>
  );
}

export function GlobeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.2 3.5 4.9 3.5 8s-1 5.8-3.5 8c-2.5-2.2-3.5-4.9-3.5-8S9.5 6.2 12 4Z" />
    </Icon>
  );
}
