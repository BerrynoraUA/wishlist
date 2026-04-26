import { useAnimatedPressFeedback } from '@/components/ui/animated-pressable';
import { Icon } from '@/components/ui/icon';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TogglePrimitive from '@rn-primitives/toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import Animated from 'react-native-reanimated';

const AnimatedToggleRoot = Animated.createAnimatedComponent(TogglePrimitive.Root);

const toggleVariants = cva(
  'active:bg-muted group flex flex-row items-center justify-center gap-2 rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border-input active:bg-accent border bg-transparent shadow-sm shadow-black/5',
      },
      size: {
        default: 'h-10 min-w-10 px-2.5 sm:h-9 sm:min-w-9 sm:px-2',
        sm: 'h-9 min-w-9 px-2 sm:h-8 sm:min-w-8 sm:px-1.5',
        lg: 'h-11 min-w-11 px-3 sm:h-10 sm:min-w-10 sm:px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Toggle({
  className,
  onPressIn,
  onPressOut,
  style,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  const { animatedStyle, handlePressIn, handlePressOut } = useAnimatedPressFeedback({
    disabled: props.disabled,
    onPressIn,
    onPressOut,
  });
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground font-medium',
        props.pressed && 'text-accent-foreground',
        className
      )}>
      <AnimatedToggleRoot
        className={cn(
          toggleVariants({ variant, size }),
          props.disabled && 'opacity-50',
          props.pressed && 'bg-accent',
          className
        )}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[style, animatedStyle]}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function ToggleIcon({ className, ...props }: React.ComponentProps<typeof Icon>) {
  const textClass = React.useContext(TextClassContext);
  return <Icon className={cn('size-4 shrink-0', textClass, className)} {...props} />;
}

export { Toggle, ToggleIcon, toggleVariants };
