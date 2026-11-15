import { useState } from 'react';

export function AcrylicForestBackdrop() {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void"
    >
      {!imgError && (
        <img
          src="/src/assets/images/bg_forest_acrylic_clean_1794640841666.jpg"
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover object-center opacity-50"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-void/65 via-charcoal/45 to-void/80" />
    </div>
  );
}
