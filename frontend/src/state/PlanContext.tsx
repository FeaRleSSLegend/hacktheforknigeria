// What the cook told us. Preferences (budget, people, allergens, body weight) are saved on this
// device only, with AsyncStorage. Nothing here leaves the phone.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { GUIDELINE_G_PER_KG, MEALS_PER_DAY } from "../engine/config";
import { pyRound } from "../engine/num";
import { targetProteinPerMeal } from "../engine/scoring";
import { PlanInput } from "../engine/types";

export interface Plan {
  mode: "pantry" | "dish";
  pantryIds: string[];
  dishId?: string;
  budgetNgn: number;
  servings: number;
  allergens: string[];
  bodyWeightKg: number | null;
  proteinPerPersonG: number; // used when no body weight is given; the cook's own choice
}

export const DEFAULT_PLAN: Plan = {
  mode: "pantry",
  pantryIds: [],
  budgetNgn: 1500,
  servings: 4,
  allergens: [],
  bodyWeightKg: null,
  proteinPerPersonG: 20,
};

const KEY = "proteinpath.prefs.v1";
type Prefs = Pick<Plan, "budgetNgn" | "servings" | "allergens" | "bodyWeightKg" | "proteinPerPersonG">;

export function targetProtein(plan: Plan): number {
  return plan.bodyWeightKg && plan.bodyWeightKg > 0
    ? pyRound(targetProteinPerMeal(plan.bodyWeightKg, GUIDELINE_G_PER_KG, MEALS_PER_DAY), 1)
    : plan.proteinPerPersonG;
}

export function toPlanInput(plan: Plan): PlanInput {
  return {
    mode: plan.mode,
    pantryIds: plan.pantryIds,
    dishId: plan.dishId,
    budgetNgn: plan.budgetNgn,
    servings: plan.servings,
    targetProteinG: targetProtein(plan),
    allergens: plan.allergens,
  };
}

const Ctx = createContext<{ plan: Plan; update: (p: Partial<Plan>) => void }>({ plan: DEFAULT_PLAN, update: () => undefined });

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((s) => {
        if (s) setPlan((p) => ({ ...p, ...(JSON.parse(s) as Partial<Prefs>) }));
      })
      .catch(() => undefined);
  }, []);

  const update = useCallback((patch: Partial<Plan>) => {
    setPlan((p) => {
      const next = { ...p, ...patch };
      const prefs: Prefs = {
        budgetNgn: next.budgetNgn,
        servings: next.servings,
        allergens: next.allergens,
        bodyWeightKg: next.bodyWeightKg,
        proteinPerPersonG: next.proteinPerPersonG,
      };
      AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ plan, update }), [plan, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePlan = () => useContext(Ctx);
