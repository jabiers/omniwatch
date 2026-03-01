import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { listRecipes, searchRecipes, getRecipe, getErrorMessage } from '@omniwatch/shared';
import { handleAgentRPC } from '@omniwatch/daemon/engine';

/** Schema: GET /recipes query params */
const listRecipesSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
});

export const recipeRoutes = new Hono();

/** GET /recipes - list all or search recipes */
recipeRoutes.get('/recipes', zValidator('query', listRecipesSchema), (c) => {
  const { q: query, category } = c.req.valid('query');

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

  const auth = c.get('auth');

  try {
    const result = await handleAgentRPC.create({
      name: recipe.name,
      prompt: recipe.prompt,
      type: 'watcher',
      template: recipe.template,
      tenantId: auth.tenantId,
    });
    return c.json({ agent: result }, 201);
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});
