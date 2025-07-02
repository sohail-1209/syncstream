export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M13 3v7h7" />
      <path d="M13 3l7 7" />
      <path d="M3 21h7v-7" />
      <path d="M3 21l7-7" />
    </svg>
  );
  