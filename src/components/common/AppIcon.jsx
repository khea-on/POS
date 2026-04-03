function AppIcon({ name, className = "", title }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const icon = (() => {
    if (name === "close") {
      return (
        <svg {...commonProps}>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      );
    }

    if (name === "menu") {
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    }

    if (name === "sun") {
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5" />
          <path d="M12 19.5V22" />
          <path d="M2 12h2.5" />
          <path d="M19.5 12H22" />
          <path d="m5 5 1.8 1.8" />
          <path d="m17.2 17.2 1.8 1.8" />
          <path d="m19 5-1.8 1.8" />
          <path d="m6.8 17.2-1.8 1.8" />
        </svg>
      );
    }

    if (name === "moon") {
      return (
        <svg {...commonProps}>
          <path d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z" />
        </svg>
      );
    }

    if (name === "clock") {
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.8v4.8l3.1 2" />
        </svg>
      );
    }

    if (name === "upload") {
      return (
        <svg {...commonProps}>
          <path d="M12 16V6" />
          <path d="m8.5 9.5 3.5-3.5 3.5 3.5" />
          <path d="M5 18.5h14" />
        </svg>
      );
    }

    if (name === "download") {
      return (
        <svg {...commonProps}>
          <path d="M12 6v10" />
          <path d="m8.5 12.5 3.5 3.5 3.5-3.5" />
          <path d="M5 18.5h14" />
        </svg>
      );
    }

    if (name === "copy") {
      return (
        <svg {...commonProps}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </svg>
      );
    }

    if (name === "logout") {
      return (
        <svg {...commonProps}>
          <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
          <path d="M14 16l4-4-4-4" />
          <path d="M18 12H9" />
        </svg>
      );
    }

    if (name === "login") {
      return (
        <svg {...commonProps}>
          <path d="M14 16l4-4-4-4" />
          <path d="M18 12H9" />
          <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
        </svg>
      );
    }

    if (name === "register") {
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a6 6 0 0 1 11 0" />
          <path d="M17 8v6" />
          <path d="M14 11h6" />
        </svg>
      );
    }

    if (name === "user") {
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      );
    }

    if (name === "key") {
      return (
        <svg {...commonProps}>
          <circle cx="8.5" cy="12" r="3.2" />
          <path d="M11.7 12H20" />
          <path d="M17 12v2" />
          <path d="M14.5 12v1.5" />
        </svg>
      );
    }

    if (name === "link") {
      return (
        <svg {...commonProps}>
          <path d="M10 13.5 8.5 15a3 3 0 1 1-4.2-4.2l3-3a3 3 0 0 1 4.2 0" />
          <path d="M14 10.5 15.5 9a3 3 0 0 1 4.2 4.2l-3 3a3 3 0 0 1-4.2 0" />
          <path d="m9 15 6-6" />
        </svg>
      );
    }

    if (name === "plus") {
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    }

    if (name === "checkout") {
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="19" r="1.6" />
          <circle cx="17" cy="19" r="1.6" />
          <path d="M3 5h2l2.2 9.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H7.2" />
        </svg>
      );
    }

    if (name === "printer") {
      return (
        <svg {...commonProps}>
          <path d="M7 8V4h10v4" />
          <path d="M7 17h10v3H7z" />
          <rect x="4" y="8" width="16" height="9" rx="2" />
          <path d="M16.5 12h.01" />
        </svg>
      );
    }

    if (name === "help") {
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9.2a2.4 2.4 0 1 1 4.2 1.6c-.7.7-1.7 1.2-2 2.4" />
          <path d="M12 17h.01" />
        </svg>
      );
    }

    if (name === "cancel") {
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6" />
          <path d="m15 9-6 6" />
        </svg>
      );
    }

    if (name === "delete") {
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M7 7l1 12a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9l1-12" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );
    }

    if (name === "save") {
      return (
        <svg {...commonProps}>
          <path d="M5 4h11l3 3v13H5z" />
          <path d="M8 4v6h7V4" />
          <path d="M8 20v-6h8v6" />
        </svg>
      );
    }

    if (name === "send") {
      return (
        <svg {...commonProps}>
          <path d="M21 3 3 10.5l7.5 3L14 21z" />
          <path d="M10.5 13.5 21 3" />
        </svg>
      );
    }

    if (name === "edit") {
      return (
        <svg {...commonProps}>
          <path d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.5L17 5.5a1.8 1.8 0 0 0-2.5 0L4 16v4Z" />
          <path d="m13.5 6.5 4 4" />
        </svg>
      );
    }

    if (name === "stock") {
      return (
        <svg {...commonProps}>
          <path d="M4 8.5 12 4l8 4.5-8 4.5L4 8.5Z" />
          <path d="M4 8.5V16l8 4.5 8-4.5V8.5" />
          <path d="M12 13v7.5" />
          <path d="M18.5 5.8v5.2" />
          <path d="M15.9 8.4h5.2" />
        </svg>
      );
    }

    if (name === "globe") {
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18" />
          <path d="M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    }

    if (name === "crm") {
      return (
        <svg {...commonProps}>
          <path d="M7 18v-1.2A3.8 3.8 0 0 1 10.8 13h2.4A3.8 3.8 0 0 1 17 16.8V18" />
          <circle cx="12" cy="8" r="3" />
          <path d="M4 19h16" />
        </svg>
      );
    }

    if (name === "ocr") {
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
          <path d="m14.5 16.5 1.8 1.8 3-3" />
        </svg>
      );
    }

    if (name === "items-screen") {
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );
    }

    if (name === "invoice-screen") {
      return (
        <svg {...commonProps}>
          <path d="M7 4h10v16l-2-1.6L13 20l-2-1.6L9 20l-2-1.6L5 20V6a2 2 0 0 1 2-2Z" />
          <path d="M9 9h6" />
          <path d="M9 13h6" />
        </svg>
      );
    }

    if (name === "dashboard") {
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    }

    if (name === "reports") {
      return (
        <svg {...commonProps}>
          <path d="M5 20V10" />
          <path d="M12 20V5" />
          <path d="M19 20v-7" />
          <path d="M3 20h18" />
        </svg>
      );
    }

    if (name === "audit") {
      return (
        <svg {...commonProps}>
          <path d="M8 3h8l3 3v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M16 3v4h4" />
          <path d="M9 11h6" />
          <path d="M9 15h6" />
          <path d="M9 19h4" />
        </svg>
      );
    }

    if (name === "settings") {
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.5 1.5 0 0 1-1.1 2.5h-.1a1 1 0 0 0-.9.6l-.1.2a1.5 1.5 0 0 1-2.7 0l-.1-.2a1 1 0 0 0-.9-.6h-.1a1.5 1.5 0 0 1-1.4-1 .9.9 0 0 0-.8-.6h-.3a.9.9 0 0 0-.8.6 1.5 1.5 0 0 1-1.4 1h-.1a1 1 0 0 0-.9.6l-.1.2a1.5 1.5 0 0 1-2.7 0l-.1-.2a1 1 0 0 0-.9-.6h-.1a1.5 1.5 0 0 1-1.1-2.5l.1-.1A1 1 0 0 0 4.6 15a.9.9 0 0 0-.9-.6h-.2a1.5 1.5 0 0 1 0-3h.2a.9.9 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1A1.5 1.5 0 0 1 5.4 7h.1a1 1 0 0 0 .9-.6l.1-.2a1.5 1.5 0 0 1 2.7 0l.1.2a1 1 0 0 0 .9.6h.1a1.5 1.5 0 0 1 1.4 1 .9.9 0 0 0 .8.6h.3a.9.9 0 0 0 .8-.6 1.5 1.5 0 0 1 1.4-1h.1a1 1 0 0 0 .9-.6l.1-.2a1.5 1.5 0 0 1 2.7 0l.1.2a1 1 0 0 0 .9.6h.1a1.5 1.5 0 0 1 1.1 2.5l-.1.1a1 1 0 0 0-.2 1.1.9.9 0 0 0 .9.6h.2a1.5 1.5 0 0 1 0 3h-.2a.9.9 0 0 0-.9.6Z" />
        </svg>
      );
    }

    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  })();

  return (
    <span className={`app-icon ${className}`.trim()} aria-hidden={title ? undefined : "true"}>
      {title ? <span className="sr-only">{title}</span> : null}
      {icon}
    </span>
  );
}

export default AppIcon;
