// Fichier: ui/src/lib/date.ts

import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Transforme une chaîne de date ISO (ex: "2023-10-27 10:30:00")
 * en une chaîne de temps relative (ex: "il y a 5 heures").
 * @param dateString La date à formater.
 * @returns La chaîne de temps relative en français.
 */
export function formatRelativeTime(dateString: string): string {
  try {
    // SQLite stocke les dates avec un espace, mais parseISO attend un 'T'.
    // On remplace l'espace pour rendre la date compatible.
    const compatibleDateString = dateString.replace(" ", "T");
    const date = parseISO(compatibleDateString);

    // Calcule la distance par rapport à maintenant, en utilisant les locales françaises.
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  } catch (error) {
    console.error("Date format error:", error);
    // En cas d'erreur, on retourne la date originale pour ne pas crasher l'app.
    return dateString;
  }
}