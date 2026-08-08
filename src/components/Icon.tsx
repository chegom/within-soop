export type IconName = "edit" | "users" | "collapse" | "expand" | "close" | "copy";

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    edit: <path d="M4 16v4h4L19 9l-4-4L4 16Zm12-9 2 2" />,
    users: (
      <>
        <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    collapse: (
      <>
        <path d="M8 3v5H3M16 21v-5h5" />
        <path d="m3 8 6-6M21 16l-6 6" />
      </>
    ),
    expand: (
      <>
        <path d="M8 3H3v5M16 21h5v-5" />
        <path d="m3 3 6 6M21 21l-6-6" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
