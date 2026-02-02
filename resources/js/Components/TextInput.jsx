import { forwardRef, useEffect, useRef } from 'react';

export default forwardRef(function TextInput(
  { type = 'text', className = '', isFocused = false, ...props },
  ref
) {
  const localRef = useRef(null);

  useEffect(() => {
    if (isFocused) {
      (ref?.current ?? localRef.current)?.focus();
    }
  }, [isFocused]);

  return (
    <input
      {...props}
      type={type}
      className={
        `rounded-lg border-gray-300 shadow-sm
         focus:border-emerald-500 focus:ring-emerald-500 ` + className
      }
      ref={ref ?? localRef}
    />
  );
});
