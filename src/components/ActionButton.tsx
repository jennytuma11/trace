interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "ghost";
  size?: "md" | "lg" | "xl";
}

const variantClasses = {
  primary: "bg-primary hover:bg-primary-dark text-white",
  secondary: "bg-white border-2 border-border hover:bg-background text-foreground",
  success: "bg-success hover:bg-emerald-700 text-white",
  warning: "bg-warning hover:bg-amber-700 text-white",
  danger: "bg-danger hover:bg-red-700 text-white",
  ghost: "bg-transparent hover:bg-background text-foreground border border-border",
};

const sizeClasses = {
  md: "px-4 py-3 text-base rounded-xl",
  lg: "px-5 py-4 text-lg rounded-2xl",
  xl: "px-6 py-5 text-xl rounded-2xl font-semibold",
};

export function ActionButton({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={`w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
