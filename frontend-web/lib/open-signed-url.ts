/**
 * Ouvre dans un nouvel onglet une URL obtenue de façon asynchrone.
 *
 * Les fichiers (supports, documents) vivent sur Spaces et ne sont servis que par
 * une URL signée demandée à l'API : un <a href> direct ne conviendrait pas, il ne
 * peut pas porter le jeton Sanctum.
 *
 * L'onglet est ouvert AVANT l'attente : ouvert après, il ne serait plus rattaché
 * au clic et le navigateur le bloquerait comme une popup.
 */
export async function openSignedUrl(resolveUrl: () => Promise<string>): Promise<void> {
  const tab = typeof window !== 'undefined' ? window.open('', '_blank') : null;

  try {
    const url = await resolveUrl();

    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}
