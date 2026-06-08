import { useCallback, useState } from "react";

export function useAsyncTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(task: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      return await task();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "操作失败";
      setError(message);
      throw reason;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, setError, run };
}
