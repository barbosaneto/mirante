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

export function PointerIcon() {
  return (
    <Icon>
      <path d="m6 3 12 9-6 1-3 5L6 3Z" />
    </Icon>
  );
}

export function MeasureIcon() {
  return (
    <Icon>
      <path d="m5 17 12-12 3 3L8 20l-3-3Z" />
      <path d="m12 10 2 2M9 13l2 2M15 7l2 2" />
    </Icon>
  );
}

export function DrawIcon() {
  return (
    <Icon>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13 7 4 4" />
    </Icon>
  );
}
