import { Hono } from 'hono';
import { listRecipes, searchRecipes, getRecipe } from '@omniwatch/shared';
import { handleAgentRPC } from '@omniwatch/daemon/engine';

export const recipeRoutes = new Hono();

/** GET /recipes - list all or search recipes */
recipeRoutes.get('/recipes', (c) => {
  const query = c.req.query('q');
  const category = c.req.query('category');

  let recipes = query ? searchRecipes(query) : listRecipes();
  if (category) {
    recipes = recipes.filter((r) => r.category === category);
  }

  return c.json({ recipes });
});

/** GET /recipes/:id - get a single recipe */
recipeRoutes.get('/recipes/:id', (c) => {
  const recipe = getRecipe(c.req.param('id'));
  if (!recipe) {
    return c.json({ error: 'Recipe not found' }, 404);
  }
  return c.json({ recipe });
});

/** POST /recipes/:id/install - create agent from recipe */
recipeRoutes.post('/recipes/:id/install', async (c) => {
  const recipe = getRecipe(c.req.param('id'));
  if (!recipe) {
    return c.json({ error: 'Recipe not found' }, 404);
  }

  try {
    const result = await handleAgentRPC.create({
      name: recipe.name,
      prompt: recipe.prompt,
      type: 'watcher',
      template: recipe.template,
    });
    return c.json({ agent: result }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});
