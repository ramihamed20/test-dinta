import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function useQuestionData(materialId, difficulty) {
  const [state, setState] = useState({ loading: true, error: "", data: [] });
  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true }));
    const params = new URLSearchParams();
    if (materialId) params.set("materialId", materialId);
    if (difficulty) params.set("difficulty", difficulty);
    const qs = params.toString();
    api(`/api/questions${qs ? `?${qs}` : ""}`)
      .then((data) => active && setState({ loading: false, error: "", data }))
      .catch((error) => active && setState({ loading: false, error: error.message, data: [] }));
    return () => { active = false; };
  }, [materialId, difficulty]);
  return { ...state, setState };
}
