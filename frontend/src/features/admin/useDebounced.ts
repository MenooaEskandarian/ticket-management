import { useEffect, useState } from "react";

/** Hold a fast-changing value still so it does not refetch on every keystroke. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
