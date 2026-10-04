// Navigateurs intégrés aux applications (TikTok, Facebook, Instagram,
// Snapchat, X, LINE) et WebView Android génériques (« ; wv) »). Google y
// refuse toute connexion OAuth (erreur 403 disallowed_useragent) : un clic sur
// « Continuer avec Google » y mène à une page d'erreur Google, sans retour
// possible vers le site. C'est précisément là qu'arrive le trafic publicitaire
// TikTok Ads / Meta Ads.
const IN_APP_BROWSER_PATTERN =
  /FBAN|FBAV|FB_IAB|FBIOS|Instagram|musical_ly|TikTok|BytedanceWebview|Snapchat|Twitter|Line\/|; wv\)/i;

export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && IN_APP_BROWSER_PATTERN.test(userAgent));
}
