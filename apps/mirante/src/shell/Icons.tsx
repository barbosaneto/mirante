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

export function UploadIcon() {
  return (
    <Icon>
      <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 14v5h14v-5" />
    </Icon>
  );
}

export function MapLibraryIcon() {
  return (
    <Icon>
      <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" />
      <path d="M9 4v14M15 6v14" />
    </Icon>
  );
}

export function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon>
      <path d="m5 12 4.5 4.5L19 7" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function TrashIcon() {
  return (
    <Icon>
      <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </Icon>
  );
}

export function ExternalLinkIcon() {
  return (
    <Icon>
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M17 13v6H5V7h6" />
    </Icon>
  );
}
