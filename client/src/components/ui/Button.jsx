import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const buttonVariants = {
  variant: {
    default: 'btn-primary',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'btn-outline',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    link: 'text-primary-600 underline-offset-4 hover:underline',
  },
  size: {
    default: 'btn-md',
    sm: 'btn-sm',
    lg: 'btn-lg',
    icon: 'h-10 w-10',
  },
};

const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    const baseClasses = buttonVariants.variant[variant] || buttonVariants.variant.default;
    const sizeClasses = buttonVariants.size[size] || buttonVariants.size.default;

    return (
      <button
        className={cn(baseClasses, sizeClasses, className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
