import { useRecipesStore } from "../state/useRecipeStore";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { publishRecipeFull } from "../utils/recipePublisher";
import { Panel } from "./Panel";

type RecipeSelectorProps = {
  className?: string;
};

export default function RecipeSelector({ className = "" }: RecipeSelectorProps) {
  const { recipes } = useRecipesStore();

  const {
    selectedRecipeId,
    setSelectedRecipeId,
    selectedRecipe,
    setSelectedRecipe,
  } = useRuntimeStore();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;

    // Actualizar runtime
    setSelectedRecipeId(id);
    const recipe = recipes.find((r) => r.id === id) || null;
    setSelectedRecipe(recipe);

    // Publicar la receta completa
    if (recipe) {
      publishRecipeFull(recipe);
    }
  };

  const republish = () => {
    if (selectedRecipe) publishRecipeFull(selectedRecipe);
  };

  return (
    <Panel title="Receta seleccionada" className={className}>
      {/* SELECTOR */}
      <select
        value={selectedRecipeId ?? ""}
        onChange={handleChange}
        className="
          w-full p-2 rounded-md border text-sm transition

          bg-slate-100 text-slate-800 border-slate-300
          focus:ring-2 focus:ring-blue-400 focus:border-blue-400

          dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700
          dark:focus:ring-blue-500 dark:focus:border-blue-500
        "
      >
        <option value="">-- Seleccionar --</option>
        {recipes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.job_id}
          </option>
        ))}
      </select>

      {/* BOTÓN PUBLICAR */}
      {selectedRecipe && (
        <button
          onClick={republish}
          className="
            mt-2 px-3 py-1 rounded text-xs font-semibold transition-all border

            bg-blue-600 text-white hover:bg-blue-500 border-blue-600
            dark:bg-blue-500 dark:hover:bg-blue-400 dark:border-blue-500
          "
        >
          Publicar receta otra vez
        </button>
      )}
    </Panel>
  );
}
