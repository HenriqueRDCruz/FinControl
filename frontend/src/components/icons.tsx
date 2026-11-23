type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const HomeIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10.5V20h13v-9.5" />
    <path d="M10 20v-5h4v5" />
  </Svg>
);

export const DashboardIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3" y="3" width="8" height="9" rx="1.5" />
    <rect x="13" y="3" width="8" height="5" rx="1.5" />
    <rect x="13" y="11" width="8" height="10" rx="1.5" />
    <rect x="3" y="15" width="8" height="6" rx="1.5" />
  </Svg>
);

export const IncomeIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 4v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4 19.5h16" />
  </Svg>
);

export const ExpenseIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 20V9" />
    <path d="m7.5 13.5 4.5-4.5 4.5 4.5" />
    <path d="M4 4.5h16" />
  </Svg>
);

export const CardIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18" />
    <path d="M7 15h3" />
  </Svg>
);

export const TrendIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Svg>
);

export const LandmarkIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 9.5 12 4l9 5.5" />
    <path d="M5.5 10.5v7M9.8 10.5v7M14.2 10.5v7M18.5 10.5v7" />
    <path d="M3 20h18" />
  </Svg>
);

export const MenuIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const CloseIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const LogoutIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M9 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H9" />
    <path d="M15 8l4 4-4 4" />
    <path d="M19 12H9.5" />
  </Svg>
);

export const UploadIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 16V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </Svg>
);
