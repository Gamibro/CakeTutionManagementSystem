const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#120214] via-[#1d0126] to-[#280637] dark:from-[#050109] dark:via-[#120214] dark:to-[#2c0a3f]">
      {/* Decorative background inspired by frosting swirls */}
      <div className="absolute inset-0 -z-10 opacity-70">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 800 600"
          fill="none"
        >
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0" stopColor="#8b1fd3" stopOpacity="0.28" />
              <stop offset="1" stopColor="#d946ef" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="g2" x1="0" x2="1">
              <stop offset="0" stopColor="#a855f7" stopOpacity="0.2" />
              <stop offset="1" stopColor="#f472b6" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#g1)" rx="0" />
          <g transform="translate(-100, -80)">
            <ellipse cx="420" cy="220" rx="420" ry="160" fill="url(#g2)" />
            <ellipse cx="100" cy="480" rx="220" ry="120" fill="#3b0a4a" />
          </g>
        </svg>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl soft-shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Left branding / illustration */}
          <div className="hidden md:flex flex-col justify-center gap-6 px-10 py-12 bg-gradient-to-br from-[#8b1fd3] via-[#a021d6] to-[#d946ef] text-white">
            <div>
              <h1 className="text-3xl font-extrabold"> Sweet of K Cakes</h1>
              <p className="mt-2 text-sm opacity-90">
                Craft irresistible lessons, schedule baking workshops, and
                celebrate every student milestone for Sweet of K Cakes.
              </p>
            </div>

            {/* Playful cake illustration to reinforce the brand */}
            <div className="mt-6">
              <svg
                width="220"
                height="150"
                viewBox="0 0 220 150"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <g filter="url(#shadow)">
                  <path
                    d="M40 110h140c10 0 18 8 18 18v2H22v-2c0-10 8-18 18-18z"
                    fill="rgba(255,255,255,0.25)"
                  />
                </g>
                <path
                  d="M60 100h100l8 30H52l8-30z"
                  fill="rgba(255,255,255,0.3)"
                />
                <path
                  d="M68 88h84l6 12H62l6-12z"
                  fill="rgba(255,255,255,0.55)"
                />
                <path
                  d="M74 72h72c8 0 14 6 14 14v2H60v-2c0-8 6-14 14-14z"
                  fill="rgba(255,255,255,0.8)"
                />
                <path
                  d="M82 58c0-8 6-14 14-14 8 0 14 6 14 14 0-8 6-14 14-14 8 0 14 6 14 14"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="110" cy="40" r="8" fill="rgba(255,255,255,0.85)" />
                <path
                  d="M110 26c3 0 6 3 6 6s-3 6-6 6-6-3-6-6 3-6 6-6z"
                  fill="rgba(255,255,255,0.7)"
                />
                <defs>
                  <filter
                    id="shadow"
                    x="12"
                    y="100"
                    width="196"
                    height="40"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feGaussianBlur in="BackgroundImageFix" stdDeviation="5" />
                    <feComposite
                      in2="SourceAlpha"
                      operator="in"
                      result="effect1_backgroundBlur"
                    />
                    <feBlend
                      mode="normal"
                      in="SourceGraphic"
                      in2="effect1_backgroundBlur"
                      result="shape"
                    />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>

          {/* Right: form container (glass card) */}
          <div className="bg-white/95 dark:bg-gray-800 p-8 md:p-12 glass-surface">
            <div className="max-w-md mx-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
