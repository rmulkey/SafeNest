interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * SafeNest Toys Logo
 *
 * Design concept: A bird (parent) sheltering a chick inside a stylized nest,
 * forming a cohesive mark that communicates protection, nurturing, and safety.
 * The negative space between parent and chick creates a subtle heart shape.
 *
 * The mark works as:
 * - A favicon at 16px (recognizable silhouette)
 * - A header logo at 32-36px (details visible)
 * - A hero mark at 48px+ (full detail)
 *
 * Colors: Deep teal for the parent bird (authority/trust), warm coral accent
 * for the chick (warmth/childhood), sage for the nest (nature/safety).
 */
export function Logo({ size = "md", className = "" }: LogoProps) {
  const dims = { sm: 32, md: 38, lg: 52 }[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        role="img"
      >
        {/* Nest base — three organic interwoven curves */}
        <path
          d="M14 48C14 48 22 56 32 56C42 56 50 48 50 48"
          stroke="#8B7355"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M18 46C18 46 24 52 32 52C40 52 46 46 46 46"
          stroke="#A68B6B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M22 44C22 44 26 48.5 32 48.5C38 48.5 42 44 42 44"
          stroke="#C4A882"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Parent bird — elegant curved form */}
        <path
          d="M20 38C20 28 24 20 32 16C32 16 26 22 26 30C26 36 28 40 32 42"
          fill="#2D6B5A"
        />
        <path
          d="M44 38C44 28 40 20 32 16C32 16 38 22 38 30C38 36 36 40 32 42"
          fill="#357A66"
        />
        {/* Parent bird head */}
        <ellipse cx="32" cy="16" rx="6" ry="5.5" fill="#2D6B5A" />
        {/* Eye */}
        <circle cx="34" cy="15" r="1.2" fill="white" />
        <circle cx="34.3" cy="14.8" r="0.5" fill="#1a1a1a" />
        {/* Beak */}
        <path
          d="M37.5 16.5L40 17L37.5 18"
          fill="#E8945A"
          stroke="#D4824A"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />

        {/* Baby chick — small, round, warm colored */}
        <ellipse cx="32" cy="36" rx="5" ry="4.5" fill="#F5C853" />
        {/* Chick head */}
        <circle cx="32" cy="31.5" r="3.5" fill="#F5C853" />
        {/* Chick eye */}
        <circle cx="33.2" cy="31" r="0.8" fill="#1a1a1a" />
        {/* Chick beak */}
        <path
          d="M35 32L36.5 32.5L35 33"
          fill="#E8945A"
          stroke="#D4824A"
          strokeWidth="0.4"
          strokeLinejoin="round"
        />
        {/* Wing detail on parent */}
        <path
          d="M24 30C24 30 27 32 28 36"
          stroke="#245B4A"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M40 30C40 30 37 32 36 36"
          stroke="#245B4A"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Small leaf accent — natural/organic touch */}
        <path
          d="M48 12C48 12 50 14 48 16C48 16 46 14 48 12Z"
          fill="#6DB88F"
          opacity="0.6"
        />
        <path
          d="M48 12C48 14 48 16 48 16"
          stroke="#5AA87A"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>

      {/* Wordmark */}
      <span className="flex flex-col leading-none select-none">
        <span className="text-[1rem] font-bold tracking-tight text-[#2D6B5A]">
          SafeNest
        </span>
        <span className="text-[0.55rem] font-semibold tracking-[0.2em] uppercase text-[#8B7355]">
          Toys
        </span>
      </span>
    </span>
  );
}
