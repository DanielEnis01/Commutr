import { useState, useEffect } from "react";
import { fetchAllPredictions } from "../services/api";

export function usePredictions() {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPredictions()
      .then((data) => setPredictions(data))
      .finally(() => setLoading(false));
  }, []);

  return { predictions, loading };
}
