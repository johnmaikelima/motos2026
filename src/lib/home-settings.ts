import "server-only";
import { prisma } from "./db";

/**
 * Categorias escolhidas para a página inicial, na ordem definida no painel.
 * Retorna [] quando nada foi configurado (a home então mostra todas por quantidade).
 */
export async function getHomeCategories(): Promise<string[]> {
  try {
    const s = await prisma.setting.findUnique({ where: { id: 1 }, select: { homeCategories: true } });
    if (!s?.homeCategories) return [];
    const parsed = JSON.parse(s.homeCategories);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
