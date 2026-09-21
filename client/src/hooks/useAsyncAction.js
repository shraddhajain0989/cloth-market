import { useState } from "react";

export function useAsyncAction(action) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(...args) {
    setLoading(true);
    setError("");
    try {
      return await action(...args);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, run };
}
