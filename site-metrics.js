(() => {
  const isProduction = window.location.protocol === "https:" && window.location.hostname === "creditcardgenerator.online";
  const analyticsDisabled = new URLSearchParams(window.location.search).get("analytics") === "off";

  if (!isProduction || analyticsDisabled) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-D59QC6ZC3D";
  document.head.append(script);

  window.gtag("js", new Date());
  window.gtag("config", "G-D59QC6ZC3D");
})();
